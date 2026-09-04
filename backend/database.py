import logging
import os
import urllib.parse
from pathlib import Path
from typing import Generator, Optional, Dict, Any

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

logger = logging.getLogger("drishti_database")

# Explicitly load backend/.env
ENV_FILE = Path(__file__).resolve().parent / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()


class Settings(BaseSettings):
    """
    Database settings loaded safely from environment variables or backend/.env.
    Credentials are never exposed to the frontend.
    """
    database_url: Optional[str] = None
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_pool_recycle: int = 300

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()


def normalize_database_url(url_str: Optional[str]) -> Optional[str]:
    """
    Normalizes database connection strings for SQLAlchemy 2.0.
    - Converts postgres:// to postgresql://
    - Correctly URL-encodes usernames or passwords containing special characters (e.g. '@', ':', '/')
    """
    if not url_str or not url_str.strip():
        return None

    cleaned = url_str.strip()

    # SQLAlchemy 2.0 requires postgresql:// instead of postgres://
    if cleaned.startswith("postgres://"):
        cleaned = "postgresql://" + cleaned[11:]

    # Handle special characters in credentials if multiple '@' exist in URL
    if "://" in cleaned:
        proto, rest = cleaned.split("://", 1)
        if "/" in rest:
            auth_host, db_part = rest.split("/", 1)
        else:
            auth_host, db_part = rest, ""

        if "@" in auth_host:
            # The last '@' separates credentials from host:port
            r_idx = auth_host.rfind("@")
            auth_part = auth_host[:r_idx]
            host_part = auth_host[r_idx + 1:]

            if ":" in auth_part:
                user, password = auth_part.split(":", 1)
                enc_user = urllib.parse.quote(urllib.parse.unquote(user), safe="")
                enc_pass = urllib.parse.quote(urllib.parse.unquote(password), safe="")
                normalized = f"{proto}://{enc_user}:{enc_pass}@{host_part}"
                if db_part:
                    normalized += f"/{db_part}"
                return normalized

    return cleaned


DATABASE_URL = normalize_database_url(
    settings.database_url or os.getenv("DATABASE_URL")
)

Base = declarative_base()

engine = None
SessionLocal = None

if DATABASE_URL:
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=settings.db_pool_recycle,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("SQLAlchemy database engine initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database engine: {e}")
else:
    logger.warning("DATABASE_URL is not configured. Cloud database features will be disabled.")


def get_db() -> Generator[Optional[Session], None, None]:
    """
    FastAPI dependency that yields an active database session and guarantees closure.
    """
    if SessionLocal is None:
        yield None
        return

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> bool:
    """
    Creates database tables if they do not exist.
    Preserves all existing tables and data.
    """
    if engine is None:
        logger.warning("Database engine not available for init_db.")
        return False

    try:
        # Import models so Base has registered all table metadata
        import models  # noqa: F401

        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Database schema verified and tables ensured successfully.")
        return True
    except Exception as e:
        logger.error(f"Database table initialization error: {e}")
        return False


def get_db_status() -> Dict[str, Any]:
    """
    Safe health check for database connectivity without leaking credentials.
    """
    if engine is None or not DATABASE_URL:
        return {
            "status": "unconfigured",
            "connected": False,
            "dialect": None,
            "host_masked": None,
        }

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        # Mask host for safety
        parsed = urllib.parse.urlparse(DATABASE_URL)
        masked_host = parsed.hostname if parsed.hostname else "unknown"
        if len(masked_host) > 8:
            masked_host = f"{masked_host[:4]}...{masked_host[-4:]}"

        return {
            "status": "connected",
            "connected": True,
            "dialect": engine.dialect.name,
            "host": masked_host,
            "pool_size": settings.db_pool_size,
        }
    except Exception as e:
        logger.warning(f"Database ping check failed: {e}")
        return {
            "status": "unreachable",
            "connected": False,
            "error": str(e).splitlines()[0] if str(e) else "Connection failed",
        }
