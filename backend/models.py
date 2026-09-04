import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON

from database import Base

# Use JSONB for PostgreSQL dialect with fallback to JSON for SQLite/Generic
JSONType = JSON().with_variant(JSONB, "postgresql")


class ReportModel(Base):
    """
    SQLAlchemy model representing the persistent PostgreSQL `reports` table.
    Maps directly to the frontend IncidentReport TypeScript data contract.
    """
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True, index=True)
    origin = Column(String(32), nullable=False, default="citizen", index=True)
    type = Column(String(64), nullable=False, index=True)
    location_name = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    description = Column(Text, nullable=False)
    media_base64 = Column(Text, nullable=True)
    urgency = Column(String(32), nullable=False, default="Medium")
    people_affected = Column(Text, nullable=False, default="Unknown")
    tags = Column(JSONType, nullable=False, default=list)
    status = Column(String(32), nullable=False, default="Submitted", index=True)
    verification_status = Column(String(32), nullable=False, default="UnderReview", index=True)
    response_status = Column(String(32), nullable=False, default="Unassigned")
    assigned_responder = Column(Text, nullable=True)
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True
    )
    source_info = Column(JSONType, nullable=False, default=dict)
    ai_analysis = Column(JSONType, nullable=True)
    ml_assessment = Column(JSONType, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    __table_args__ = (
        Index("idx_reports_timestamp_desc", timestamp.desc()),
        Index("idx_reports_coords", latitude, longitude),
        Index("idx_reports_status_verif", status, verification_status),
    )

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes database row to a JSON-compatible dictionary matching the
        frontend `IncidentReport` TypeScript interface.
        """
        iso_timestamp = (
            self.timestamp.isoformat()
            if isinstance(self.timestamp, (datetime.datetime, datetime.date))
            else str(self.timestamp)
        )

        coordinates = None
        if self.latitude is not None and self.longitude is not None:
            coordinates = {
                "latitude": float(self.latitude),
                "longitude": float(self.longitude),
            }

        return {
            "id": self.id,
            "origin": self.origin or "citizen",
            "type": self.type,
            "locationName": self.location_name,
            "coordinates": coordinates,
            "description": self.description,
            "mediaBase64": self.media_base64,
            "urgency": self.urgency or "Medium",
            "peopleAffected": self.people_affected or "Unknown",
            "tags": self.tags if isinstance(self.tags, list) else [],
            "status": self.status or "Submitted",
            "verificationStatus": self.verification_status or "UnderReview",
            "responseStatus": self.response_status or "Unassigned",
            "assignedResponder": self.assigned_responder,
            "timestamp": iso_timestamp,
            "sourceInfo": self.source_info if isinstance(self.source_info, dict) else {},
            "aiAnalysis": self.ai_analysis if isinstance(self.ai_analysis, dict) else None,
            "mlAssessment": self.ml_assessment if isinstance(self.ml_assessment, dict) else None,
        }
