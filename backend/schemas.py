from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class ReportSourceInfo(BaseModel):
    platform: str = "DRISHTI Web App"
    authorName: str = "Citizen Reporter"
    authorHandle: Optional[str] = None
    authorAvatar: Optional[str] = None
    sourceUrl: Optional[str] = None
    verifiedUser: Optional[bool] = False
    engagementStats: Optional[Dict[str, Any]] = None
    directSourceName: Optional[str] = None


class AIReportAnalysis(BaseModel):
    verdict: str = "Needs Review"
    confidenceScore: float = 50.0
    confidenceLevel: str = "Medium"
    reasoning: List[str] = Field(default_factory=list)
    crossReferenceTelemetry: Optional[str] = None
    sensorCorrelation: Optional[str] = None
    satelliteValidation: Optional[str] = None
    crowdConsensus: Optional[str] = None
    computerVisionAudit: Optional[str] = None
    reviewedAt: Optional[str] = None


class MLReportAssessment(BaseModel):
    prediction: str = "not_informative"
    informative_probability: float = 0.0
    not_informative_probability: float = 0.0
    evaluatedAt: Optional[str] = None
    status: str = "completed"
    error: Optional[str] = None


class ReportCreateSchema(BaseModel):
    """
    Schema for creating a report, directly compatible with the frontend submission payload.
    """
    id: Optional[str] = None
    origin: Optional[str] = "citizen"
    type: str
    locationName: str
    coordinates: Optional[Coordinates] = None
    description: str
    mediaBase64: Optional[str] = None
    urgency: Optional[str] = "Medium"
    peopleAffected: Optional[str] = "Unknown"
    tags: Optional[List[str]] = Field(default_factory=list)
    status: Optional[str] = "Submitted"
    verificationStatus: Optional[str] = "UnderReview"
    responseStatus: Optional[str] = "Unassigned"
    assignedResponder: Optional[str] = None
    timestamp: Optional[str] = None
    sourceInfo: Optional[ReportSourceInfo] = None
    aiAnalysis: Optional[AIReportAnalysis] = None
    mlAssessment: Optional[MLReportAssessment] = None

    model_config = ConfigDict(populate_by_name=True)


class ReportUpdateSchema(BaseModel):
    """
    Schema for dispatcher mutations (verification, response assignment).
    """
    status: Optional[str] = None
    verificationStatus: Optional[str] = None
    responseStatus: Optional[str] = None
    assignedResponder: Optional[str] = None
    aiAnalysis: Optional[AIReportAnalysis] = None

    model_config = ConfigDict(populate_by_name=True)


class ReportResponseSchema(BaseModel):
    """
    Standard response schema matching TypeScript IncidentReport.
    """
    id: str
    origin: str = "citizen"
    type: str
    locationName: str
    coordinates: Optional[Coordinates] = None
    description: str
    mediaBase64: Optional[str] = None
    urgency: str = "Medium"
    peopleAffected: str = "Unknown"
    tags: List[str] = Field(default_factory=list)
    status: str = "Submitted"
    verificationStatus: str = "UnderReview"
    responseStatus: str = "Unassigned"
    assignedResponder: Optional[str] = None
    timestamp: str
    sourceInfo: ReportSourceInfo = Field(default_factory=ReportSourceInfo)
    aiAnalysis: Optional[AIReportAnalysis] = None
    mlAssessment: Optional[MLReportAssessment] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
