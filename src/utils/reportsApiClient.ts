/**
 * DRISHTI Multi-Device Reports API Client
 * Facilitates shared cloud synchronization with the FastAPI PostgreSQL backend.
 * 
 * Rules:
 * - Reads base URL from VITE_API_BASE_URL / VITE_ML_API_BASE_URL or defaults to localhost in dev.
 * - Never contains or leaks database credentials.
 * - Handles offline / network failures gracefully without breaking UI workflows.
 */

import type { IncidentReport } from '../types/report';

export interface ReportFilterParams {
  status?: string;
  verificationStatus?: string;
  verification_status?: string;
  origin?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

/**
 * Resolves the Reports REST API Base URL.
 */
export const getReportsApiBaseUrl = (): string => {
  // 1. Explicit API base URL from Vite environment variable
  const baseEnv = (import.meta as any).env?.VITE_API_BASE_URL;
  if (baseEnv && typeof baseEnv === 'string' && baseEnv.trim() !== '') {
    return baseEnv.trim().replace(/\/$/, '');
  }

  // 2. ML / Backend base URL variable if set
  const mlEnv = (import.meta as any).env?.VITE_ML_API_BASE_URL;
  if (mlEnv && typeof mlEnv === 'string' && mlEnv.trim() !== '') {
    return mlEnv.trim().replace(/\/$/, '');
  }

  // 3. Development fallback on localhost / loopback
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://127.0.0.1:8000';
  }

  // 4. Same-origin relative path in production
  return '';
};

/**
 * Posts a new incident report to the central cloud PostgreSQL database.
 */
export async function createReport(report: IncidentReport): Promise<IncidentReport> {
  const baseUrl = getReportsApiBaseUrl();
  const endpoint = `${baseUrl}/api/reports`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(report),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorDetail = await response.text().catch(() => '');
      throw new Error(`Server returned HTTP ${response.status}: ${errorDetail || response.statusText}`);
    }

    const savedReport = await response.json();
    return savedReport as IncidentReport;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.warn('[DRISHTI Reports API] createReport error:', error?.message || error);
    throw error;
  }
}

/**
 * Fetches reports from the cloud PostgreSQL database with optional filters.
 */
export async function fetchReports(filters?: ReportFilterParams): Promise<IncidentReport[]> {
  const baseUrl = getReportsApiBaseUrl();
  const params = new URLSearchParams();

  if (filters) {
    if (filters.status) params.append('status', filters.status);
    if (filters.verificationStatus || filters.verification_status) {
      params.append('verification_status', filters.verificationStatus || filters.verification_status || '');
    }
    if (filters.origin) params.append('origin', filters.origin);
    if (filters.type) params.append('type', filters.type);
    if (filters.limit !== undefined) params.append('limit', String(filters.limit));
    if (filters.offset !== undefined) params.append('offset', String(filters.offset));
  }

  const queryString = params.toString();
  const endpoint = `${baseUrl}/api/reports${queryString ? `?${queryString}` : ''}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const reports = await response.json();
    return Array.isArray(reports) ? (reports as IncidentReport[]) : [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.warn('[DRISHTI Reports API] fetchReports error:', error?.message || error);
    throw error;
  }
}

/**
 * Fetches a single report by its unique ID from the cloud database.
 */
export async function fetchReport(id: string): Promise<IncidentReport> {
  const baseUrl = getReportsApiBaseUrl();
  const endpoint = `${baseUrl}/api/reports/${encodeURIComponent(id)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const report = await response.json();
    return report as IncidentReport;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.warn(`[DRISHTI Reports API] fetchReport(${id}) error:`, error?.message || error);
    throw error;
  }
}

/**
 * Updates workflow fields of an existing report in the cloud database.
 */
export async function updateReport(
  id: string,
  updates: Partial<IncidentReport>
): Promise<IncidentReport> {
  const baseUrl = getReportsApiBaseUrl();
  const endpoint = `${baseUrl}/api/reports/${encodeURIComponent(id)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(updates),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorDetail = await response.text().catch(() => '');
      throw new Error(`Server returned HTTP ${response.status}: ${errorDetail || response.statusText}`);
    }

    const updatedReport = await response.json();
    return updatedReport as IncidentReport;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.warn(`[DRISHTI Reports API] updateReport(${id}) error:`, error?.message || error);
    throw error;
  }
}
