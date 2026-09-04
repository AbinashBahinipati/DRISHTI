import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from models import ReportModel
from schemas import (
    ReportCreateSchema,
    ReportResponseSchema,
    ReportUpdateSchema,
)

logger = logging.getLogger("drishti_reports_api")

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def parse_iso_datetime(dt_str: Optional[str]) -> datetime:
    """Safely parse ISO datetime string or fallback to UTC now."""
    if not dt_str:
        return datetime.now(timezone.utc)
    try:
        cleaned = dt_str.strip().replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)
    except Exception:
        return datetime.now(timezone.utc)


@router.post(
    "",
    response_model=ReportResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create disaster incident report",
)
def create_report(
    payload: ReportCreateSchema,
    db: Optional[Session] = Depends(get_db),
):
    """
    Saves a disaster incident report to the central PostgreSQL Supabase database.
    - Preserves frontend-supplied ID or generates a unique report ID.
    - Enforces that citizen reports are not automatically marked Verified.
    - Accurately stores location coordinates and structured JSON metadata.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable.",
        )

    try:
        # 1. Determine report ID
        report_id = payload.id.strip() if payload.id and payload.id.strip() else f"report-{uuid.uuid4().hex[:12]}"

        # Check if ID already exists (idempotency / conflict guard)
        existing = db.query(ReportModel).filter(ReportModel.id == report_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A report with ID '{report_id}' already exists.",
            )

        # 2. Enforce origin & verification integrity
        origin = payload.origin or "citizen"
        verification_status = payload.verificationStatus or "UnderReview"

        # Rule: Citizen-submitted reports must start as UnderReview or Unverified, never Verified
        if origin == "citizen" and verification_status == "Verified":
            verification_status = "UnderReview"

        # 3. Extract coordinates
        latitude = payload.coordinates.latitude if payload.coordinates else None
        longitude = payload.coordinates.longitude if payload.coordinates else None

        # 4. Extract dicts for JSONB fields
        tags = payload.tags if payload.tags is not None else []
        source_info = payload.sourceInfo.model_dump(exclude_none=True) if payload.sourceInfo else {}
        ai_analysis = payload.aiAnalysis.model_dump(exclude_none=True) if payload.aiAnalysis else None
        ml_assessment = payload.mlAssessment.model_dump(exclude_none=True) if payload.mlAssessment else None

        # 5. Parse timestamp
        timestamp = parse_iso_datetime(payload.timestamp)

        # 6. Create SQLAlchemy model instance
        db_report = ReportModel(
            id=report_id,
            origin=origin,
            type=payload.type.strip(),
            location_name=payload.locationName.strip(),
            latitude=latitude,
            longitude=longitude,
            description=payload.description.strip(),
            media_base64=payload.mediaBase64,
            urgency=payload.urgency or "Medium",
            people_affected=payload.peopleAffected or "Unknown",
            tags=tags,
            status=payload.status or "Submitted",
            verification_status=verification_status,
            response_status=payload.responseStatus or "Unassigned",
            assigned_responder=payload.assignedResponder,
            timestamp=timestamp,
            source_info=source_info,
            ai_analysis=ai_analysis,
            ml_assessment=ml_assessment,
        )

        db.add(db_report)
        db.commit()
        db.refresh(db_report)

        logger.info(f"Report '{report_id}' successfully saved to database (origin: {origin}).")
        return db_report.to_dict()

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist report to database.",
        )


@router.get(
    "",
    response_model=List[ReportResponseSchema],
    summary="Get all reports with optional filtering",
)
def get_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    verification_status: Optional[str] = Query(None, alias="verification_status"),
    verification_status_camel: Optional[str] = Query(None, alias="verificationStatus"),
    origin: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None, alias="type"),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db),
):
    """
    Fetches reports sorted newest first (timestamp DESC) with optional filters
    for status, verification_status, origin, and type.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable.",
        )

    try:
        query = db.query(ReportModel)

        # Apply filters if provided
        if status_filter:
            query = query.filter(ReportModel.status == status_filter)

        verif_filter = verification_status or verification_status_camel
        if verif_filter:
            query = query.filter(ReportModel.verification_status == verif_filter)

        if origin:
            query = query.filter(ReportModel.origin == origin)

        if report_type:
            query = query.filter(ReportModel.type == report_type)

        # Sort newest first
        query = query.order_by(desc(ReportModel.timestamp)).offset(offset).limit(limit)
        results = query.all()

        return [report.to_dict() for report in results]

    except Exception as e:
        logger.error(f"Failed to fetch reports: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reports from database.",
        )


@router.get(
    "/{report_id}",
    response_model=ReportResponseSchema,
    summary="Get report by ID",
)
def get_report_by_id(
    report_id: str,
    db: Optional[Session] = Depends(get_db),
):
    """
    Retrieves a single report by its unique ID.
    Returns HTTP 404 if not found.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable.",
        )

    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' not found.",
        )

    return report.to_dict()


@router.patch(
    "/{report_id}",
    response_model=ReportResponseSchema,
    summary="Update report workflow status / verification",
)
def update_report(
    report_id: str,
    payload: ReportUpdateSchema,
    db: Optional[Session] = Depends(get_db),
):
    """
    Updates report fields for the authorized organization workflow.
    Supports mutating verificationStatus, status, responseStatus, assignedResponder, and aiAnalysis.
    Protected against modifying immutable fields or database credentials.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable.",
        )

    try:
        report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report with ID '{report_id}' not found.",
            )

        # Update safe fields if supplied in payload
        if payload.status is not None:
            report.status = payload.status

        if payload.verificationStatus is not None:
            report.verification_status = payload.verificationStatus

        if payload.responseStatus is not None:
            report.response_status = payload.responseStatus

        if payload.assignedResponder is not None:
            report.assigned_responder = payload.assignedResponder

        if payload.aiAnalysis is not None:
            report.ai_analysis = payload.aiAnalysis.model_dump(exclude_none=True)

        report.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(report)

        logger.info(f"Report '{report_id}' updated successfully.")
        return report.to_dict()

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update report '{report_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update report in database.",
        )


@router.delete(
    "/{report_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete report by ID",
)
def delete_report(
    report_id: str,
    db: Optional[Session] = Depends(get_db),
):
    """
    Deletes a report by ID. Used for cleanup and test teardown.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable.",
        )

    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' not found.",
        )

    try:
        db.delete(report)
        db.commit()
        logger.info(f"Report '{report_id}' deleted successfully.")
        return {"status": "deleted", "id": report_id}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete report '{report_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete report from database.",
        )
