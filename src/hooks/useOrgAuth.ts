/**
 * DRISHTI Organization Command Authentication Hook
 * Strictly separate from Citizen/User authentication.
 * 
 * Rules:
 * - Credentials are verified via FastAPI backend (POST /api/auth/organization/login).
 * - No credentials are hardcoded or exposed in frontend code.
 * - Manages secure organization operator session tokens.
 */

import { useState, useEffect, useCallback } from 'react';
import { getReportsApiBaseUrl } from '../utils/reportsApiClient';

const ORG_SESSION_KEY = 'drishti_org_session_v1';

export interface OrgOperator {
  id: string;
  name: string;
  role: 'organization';
  level: string;
}

export interface OrgSession {
  token: string;
  organization: OrgOperator;
  expiresAt: number;
}

const getStoredOrgSession = (): OrgSession | null => {
  try {
    const raw = sessionStorage.getItem(ORG_SESSION_KEY) || localStorage.getItem(ORG_SESSION_KEY);
    if (!raw) return null;
    const session: OrgSession = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt && session.expiresAt < now) {
      sessionStorage.removeItem(ORG_SESSION_KEY);
      localStorage.removeItem(ORG_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

const saveOrgSession = (session: OrgSession | null) => {
  try {
    if (session) {
      sessionStorage.setItem(ORG_SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(ORG_SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(ORG_SESSION_KEY);
      localStorage.removeItem(ORG_SESSION_KEY);
    }
  } catch (e) {
    console.warn('Failed to save organization session:', e);
  }
};

export const useOrgAuth = () => {
  const [session, setSession] = useState<OrgSession | null>(getStoredOrgSession);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setSession(getStoredOrgSession());
    };

    window.addEventListener('drishti-org-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('drishti-org-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const login = useCallback(async (
    loginId: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanId = loginId.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setIsLoading(false);
      return { success: false, error: 'Login ID and Password are required.' };
    }

    const baseUrl = getReportsApiBaseUrl();
    const endpoint = `${baseUrl}/api/auth/organization/login`;

    try {
      console.info(`[DRISHTI Org Auth] Submitting authentication request to: ${endpoint}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          loginId: cleanId,
          password: cleanPass
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle non-200 responses with exact status differentiation
      if (!response.ok) {
        let errDetail = '';
        try {
          const errJson = await response.json();
          if (errJson?.detail) errDetail = errJson.detail;
        } catch {
          // ignore parsing error
        }

        if (response.status === 401) {
          return {
            success: false,
            error: errDetail || 'Invalid organization credentials. Please check your Login ID and Password.'
          };
        }

        if (response.status === 400 || response.status === 422) {
          return {
            success: false,
            error: errDetail || 'Please provide a valid Login ID and Password.'
          };
        }

        if (response.status === 404) {
          return {
            success: false,
            error: `Authentication endpoint not found (${endpoint}). Please verify the backend service is running.`
          };
        }

        if (response.status >= 500) {
          return {
            success: false,
            error: `Authentication server error (HTTP ${response.status}). Please try again later.`
          };
        }

        return {
          success: false,
          error: errDetail || `Server returned HTTP ${response.status}`
        };
      }

      const data = await response.json();
      if (!data?.token || !data?.organization) {
        return {
          success: false,
          error: 'Invalid authentication response structure from server.'
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const newSession: OrgSession = {
        token: data.token,
        organization: data.organization,
        expiresAt: now + (data.expiresIn || 86400)
      };

      saveOrgSession(newSession);
      setSession(newSession);
      window.dispatchEvent(new CustomEvent('drishti-org-auth-changed'));

      console.info(`[DRISHTI Org Auth] Authentication successful for operator: ${data.organization.id}`);
      return { success: true };
    } catch (err: any) {
      console.warn('[DRISHTI Org Auth] Network/Connection error:', err?.message || err);
      return {
        success: false,
        error: err?.name === 'AbortError'
          ? `Authentication request timed out reaching ${endpoint}. Please verify the backend server is running.`
          : `Unable to connect to the authentication server at ${baseUrl || 'http://localhost:8000'}. Please ensure the FastAPI backend is running.`
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    saveOrgSession(null);
    setSession(null);
    window.dispatchEvent(new CustomEvent('drishti-org-auth-changed'));
  }, []);

  const verifySession = useCallback(async (): Promise<boolean> => {
    const current = getStoredOrgSession();
    if (!current?.token) return false;

    try {
      const baseUrl = getReportsApiBaseUrl();
      const endpoint = `${baseUrl}/api/auth/organization/verify`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${current.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        logout();
        return false;
      }

      return true;
    } catch {
      // If offline, trust existing valid non-expired token
      return !!current;
    }
  }, [logout]);

  return {
    operator: session?.organization || null,
    token: session?.token || null,
    isAuthenticated: !!session?.token,
    isLoading,
    login,
    logout,
    verifySession
  };
};
