import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import joblib
from pydantic import BaseModel, Field

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("drishti_ml_backend")

# Base directory for model artifacts (relative to this file, without leaking paths externally)
MODEL_DIR = Path(__file__).resolve().parent / "model"
VECTORIZER_FILE = MODEL_DIR / "tfidf_vectorizer.joblib"
CLASSIFIER_FILE = MODEL_DIR / "report_classifier.joblib"
METADATA_FILE = MODEL_DIR / "model_metadata.json"


class MLModelManager:
    """Manages lifecycle, inference, and error handling for DRISHTI ML models."""

    def __init__(self):
        self.vectorizer = None
        self.classifier = None
        self.metadata: Dict[str, Any] = {}
        self.is_loaded: bool = False
        self.load_error: Optional[str] = None

    def load_model(self):
        try:
            if not VECTORIZER_FILE.exists():
                raise FileNotFoundError(
                    "TF-IDF vectorizer artifact 'tfidf_vectorizer.joblib' not found."
                )
            if not CLASSIFIER_FILE.exists():
                raise FileNotFoundError(
                    "Classifier artifact 'report_classifier.joblib' not found."
                )

            logger.info("Loading TF-IDF vectorizer artifact...")
            self.vectorizer = joblib.load(VECTORIZER_FILE)

            logger.info("Loading report classifier artifact...")
            self.classifier = joblib.load(CLASSIFIER_FILE)

            if METADATA_FILE.exists():
                try:
                    with open(METADATA_FILE, "r", encoding="utf-8") as f:
                        self.metadata = json.load(f)
                except Exception as meta_err:
                    logger.warning(f"Could not parse model metadata: {meta_err}")
                    self.metadata = {}

            self.is_loaded = True
            self.load_error = None
            logger.info("DRISHTI ML model and vectorizer loaded successfully.")

        except Exception as e:
            self.is_loaded = False
            self.load_error = str(e)
            logger.error(f"Failed to load ML model: {e}")

    def predict_report(self, text: str) -> Dict[str, Any]:
        if not self.is_loaded or self.vectorizer is None or self.classifier is None:
            raise RuntimeError(
                "ML model is not loaded or currently unavailable."
            )

        # Transform using vectorizer
        features = self.vectorizer.transform([text])

        # Get probabilities directly from model.predict_proba()
        proba = self.classifier.predict_proba(features)[0]
        classes = list(self.classifier.classes_)

        if "informative" not in classes or "not_informative" not in classes:
            raise ValueError("Model classes do not match expected labels.")

        inf_idx = classes.index("informative")
        not_inf_idx = classes.index("not_informative")

        inf_prob = float(proba[inf_idx])
        not_inf_prob = float(proba[not_inf_idx])

        # Predict class label directly from classifier
        prediction_label = str(self.classifier.predict(features)[0])

        return {
            "prediction": prediction_label,
            "informative_probability": inf_prob,
            "not_informative_probability": not_inf_prob,
        }


from database import init_db, get_db_status
import reports_api
import auth_api

ml_manager = MLModelManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load ML artifacts once at startup
    ml_manager.load_model()
    # Initialize database connection and verify reports table
    init_db()
    yield
    # Shutdown logic if required


app = FastAPI(
    title="DRISHTI ML Backend",
    description="Disaster report classification & informativeness inference service with multi-device cloud storage",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend development and production deployment origins
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

env_origins = os.getenv("CORS_ORIGINS") or os.getenv("FRONTEND_URL")
if env_origins:
    for origin in env_origins.split(","):
        cleaned = origin.strip()
        if cleaned and cleaned not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST endpoints for Reports & Organization Authentication
app.include_router(reports_api.router)
app.include_router(auth_api.router)


class AnalyzeReportRequest(BaseModel):
    text: str = Field(..., description="Disaster report narrative text")


class AnalyzeReportResponse(BaseModel):
    prediction: str = Field(..., description="'informative' or 'not_informative'")
    informative_probability: float = Field(
        ..., description="Direct probability from model.predict_proba() for informative class"
    )
    not_informative_probability: float = Field(
        ..., description="Direct probability from model.predict_proba() for not_informative class"
    )


@app.get("/health")
def health():
    """
    Health check confirming ML model loading state and database connectivity
    without exposing local file paths or database credentials.
    """
    db_status = get_db_status()
    is_ok = ml_manager.is_loaded

    response_data = {
        "status": "ok" if is_ok else "degraded",
        "service": "DRISHTI ML Backend",
        "model_loaded": ml_manager.is_loaded,
        "database": db_status,
    }

    if ml_manager.is_loaded:
        response_data["model_info"] = {
            "model_name": ml_manager.metadata.get(
                "model_name", "DRISHTI Report Classifier"
            ),
            "model_type": ml_manager.metadata.get(
                "model_type", "TF-IDF + Logistic Regression"
            ),
            "task": ml_manager.metadata.get(
                "task", "Informative vs Not Informative"
            ),
        }
    else:
        response_data["detail"] = "ML model artifacts are not loaded."

    return response_data


@app.post(
    "/api/ml/analyze-report",
    response_model=AnalyzeReportResponse,
    status_code=status.HTTP_200_OK,
)
def analyze_report(request: AnalyzeReportRequest):
    """
    Classifies a disaster incident report narrative into informative or not_informative
    with raw probabilities directly from the trained Logistic Regression model.
    """
    # Validate non-empty text
    cleaned_text = request.text.strip() if request.text else ""
    if not cleaned_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report text cannot be empty or contain only whitespace.",
        )

    # Check model readiness
    if not ml_manager.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is not loaded or unavailable on backend.",
        )

    try:
        result = ml_manager.predict_report(cleaned_text)
        return result
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during report classification.",
        )
