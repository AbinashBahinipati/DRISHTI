/**
 * DRISHTI ML Backend Client
 * Connects to the FastAPI ML service (POST /api/ml/analyze-report).
 * 
 * Rules:
 * - NO mock, fake, simulated, or hardcoded probability values.
 * - If backend is unavailable or offline, mark status accordingly without fake scores.
 * - Base URL is configurable via VITE_ML_API_BASE_URL or VITE_API_BASE_URL.
 */

import type { MLReportAssessment } from '../types/report';

/**
 * Resolves the ML API base URL based on environment configuration.
 * - VITE_ML_API_BASE_URL: Explicit ML server URL (e.g. http://127.0.0.1:8000 or production domain)
 * - VITE_API_BASE_URL: Standard Android / LAN API host (e.g. http://192.168.29.179:4173)
 * - Empty string: Same-origin relative path for web browser / Vite proxy
 */
export const getMLApiBaseUrl = (): string => {
  // 1. Explicit ML base URL from Vite env (e.g. VITE_ML_API_BASE_URL)
  const mlEnv = (import.meta as any).env?.VITE_ML_API_BASE_URL;
  if (mlEnv && typeof mlEnv === 'string' && mlEnv.trim() !== '') {
    return mlEnv.trim().replace(/\/$/, '');
  }

  // 2. Existing project API base URL (e.g. VITE_API_BASE_URL for Android/Capacitor)
  const baseEnv = (import.meta as any).env?.VITE_API_BASE_URL;
  if (baseEnv && typeof baseEnv === 'string' && baseEnv.trim() !== '') {
    return baseEnv.trim().replace(/\/$/, '');
  }

  // 3. In local web development, default to local FastAPI ML port if hostname is localhost
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://127.0.0.1:8000';
  }

  // 4. In production environments without explicit override, use same-origin relative path
  return '';
};

/**
 * Sends report narrative text to the DRISHTI FastAPI ML backend for classification.
 * Returns the exact prediction and probabilities directly from model.predict_proba().
 */
export async function analyzeReportNarrative(text: string): Promise<MLReportAssessment> {
  const trimmed = text ? text.trim() : '';
  const now = new Date().toISOString();

  // If narrative is empty, cannot classify
  if (!trimmed) {
    return {
      prediction: 'not_informative',
      informative_probability: 0,
      not_informative_probability: 0,
      evaluatedAt: now,
      status: 'unavailable',
      error: 'Narrative text is empty'
    };
  }

  // If strictly offline, do not claim the model ran
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      prediction: 'not_informative',
      informative_probability: 0,
      not_informative_probability: 0,
      evaluatedAt: now,
      status: 'pending',
      error: 'Offline - pending synchronization'
    };
  }

  const apiBase = getMLApiBaseUrl();
  const endpoint = `${apiBase}/api/ml/analyze-report`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: trimmed }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[DRISHTI ML API] Endpoint returned status ${response.status}`);
      return {
        prediction: 'not_informative',
        informative_probability: 0,
        not_informative_probability: 0,
        evaluatedAt: now,
        status: 'unavailable',
        error: `HTTP error ${response.status}`
      };
    }

    const data = await response.json();

    if (
      data &&
      (data.prediction === 'informative' || data.prediction === 'not_informative') &&
      typeof data.informative_probability === 'number' &&
      typeof data.not_informative_probability === 'number'
    ) {
      return {
        prediction: data.prediction,
        informative_probability: data.informative_probability,
        not_informative_probability: data.not_informative_probability,
        evaluatedAt: now,
        status: 'completed'
      };
    }

    return {
      prediction: 'not_informative',
      informative_probability: 0,
      not_informative_probability: 0,
      evaluatedAt: now,
      status: 'unavailable',
      error: 'Malformed response structure from ML service'
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('[DRISHTI ML API] Failed to reach ML backend:', err?.message || err);
    return {
      prediction: 'not_informative',
      informative_probability: 0,
      not_informative_probability: 0,
      evaluatedAt: now,
      status: 'unavailable',
      error: err?.name === 'AbortError' ? 'ML service request timed out' : 'ML service unreachable'
    };
  }
}
