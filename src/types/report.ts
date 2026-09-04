export type ReportType =
  | 'Flood'
  | 'Cyclone'
  | 'Fire'
  | 'Landslide'
  | 'HeavyRain'
  | 'Earthquake'
  | 'ExtremeHeat'
  | 'InfrastructureDamage'
  | 'RoadBlockage'
  | 'Other';

export type ReportUrgency = 'Low' | 'Medium' | 'Critical';

export type ReportStatus = 'Draft' | 'PendingSync' | 'Submitted' | 'UnderReview' | 'Verified' | 'Resolved' | 'Avoid';

export type ResponseStatus = 'Unassigned' | 'ResponderAssigned' | 'EnRoute' | 'OnScene' | 'AssistanceProvided' | 'Resolved';

export type VerificationStatus = 'Unverified' | 'UnderReview' | 'Verified' | 'Rejected';

export type AIConfidenceLevel = 'High' | 'Medium' | 'Low';

export type AIVerdict = 'Genuine' | 'Needs Review' | 'Avoid';

export type ReportPlatform =
  | 'DRISHTI Web App'
  | 'Twitter / X'
  | 'Telegram Alert'
  | 'Reddit Emergency'
  | 'GDACS Global Alert'
  | 'News Wire'
  | 'ReliefWeb';

export type ReportOrigin = 'direct_source' | 'citizen';

export interface ReportSourceInfo {
  platform: ReportPlatform;
  authorName: string;
  authorHandle?: string;
  authorAvatar?: string;
  sourceUrl?: string;
  verifiedUser?: boolean;
  engagementStats?: {
    shares?: number;
    corroborations?: number;
  };
  directSourceName?: string;
}

export interface AIReportAnalysis {
  verdict: AIVerdict;
  confidenceScore: number; // 0 to 100
  confidenceLevel: AIConfidenceLevel;
  reasoning: string[];
  crossReferenceTelemetry?: string;
  sensorCorrelation?: string;
  satelliteValidation?: string;
  crowdConsensus?: string;
  computerVisionAudit?: string;
  reviewedAt: string;
}

export interface MLReportAssessment {
  prediction: 'informative' | 'not_informative';
  informative_probability: number;
  not_informative_probability: number;
  evaluatedAt: string;
  status: 'completed' | 'unavailable' | 'pending';
  error?: string;
}

export interface IncidentReport {
  id: string;
  origin?: ReportOrigin;
  type: ReportType;
  locationName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  description: string;
  mediaBase64: string | null;
  urgency: ReportUrgency;
  peopleAffected: string;
  tags: string[];
  status: ReportStatus;
  verificationStatus: VerificationStatus;
  responseStatus?: ResponseStatus;
  assignedResponder?: string;
  timestamp: string;
  sourceInfo?: ReportSourceInfo;
  aiAnalysis?: AIReportAnalysis;
  mlAssessment?: MLReportAssessment;
}

/**
 * Identifies if a report originates directly from an authoritative live telemetry feed
 * (e.g. USGS Seismology, NASA FIRMS, Open-Meteo, GloFAS/ECMWF) rather than a citizen submission.
 */
export function isDirectSourceReport(report: IncidentReport): boolean {
  if (report.origin === 'direct_source') return true;
  if (report.origin === 'citizen') return false;

  // Existing metadata checks on the data model
  if (report.sourceInfo?.directSourceName) return true;
  if (report.sourceInfo?.platform === 'GDACS Global Alert') return true;
  if (report.id.startsWith('LIVE-') || report.id.startsWith('usgs-')) return true;

  return false;
}

/**
 * Returns the readable direct source name stored on the report.
 */
export function getDirectSourceLabel(report: IncidentReport): string {
  if (report.sourceInfo?.directSourceName) {
    return report.sourceInfo.directSourceName;
  }
  if (report.sourceInfo?.authorName && report.sourceInfo.authorName !== 'Citizen Reporter' && report.sourceInfo.authorName !== 'Citizen / Field Responder') {
    return report.sourceInfo.authorName;
  }
  if (report.type === 'Earthquake') {
    return 'Live USGS Seismic Feed';
  }
  if (report.sourceInfo?.platform) {
    return report.sourceInfo.platform;
  }
  return 'Live Telemetry Feed';
}

/**
 * Resolves the operational priority classification for any report.
 * Direct live feeds and GDACS Global Alerts are authoritative institutional alerts,
 * and are therefore ALWAYS classified as 'Genuine' (Priority) and never as Avoid / Spam.
 */
export function getReportPriorityVerdict(report: IncidentReport): 'Genuine' | 'Needs Review' | 'Avoid' {
  if (report.sourceInfo?.platform === 'GDACS Global Alert' || isDirectSourceReport(report)) {
    return 'Genuine';
  }
  if (report.status === 'Verified' || report.verificationStatus === 'Verified') {
    return 'Genuine';
  }
  if (report.status === 'Avoid' || report.verificationStatus === 'Rejected' || report.aiAnalysis?.verdict === 'Avoid') {
    return 'Avoid';
  }
  if (report.aiAnalysis?.verdict === 'Genuine' || report.aiAnalysis?.confidenceLevel === 'High') {
    return 'Genuine';
  }
  return 'Needs Review';
}

