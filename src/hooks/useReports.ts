import { useState, useEffect, useCallback } from 'react';
import type { IncidentReport, ReportSourceInfo } from '../types/report';
import { analyzeIncidentReport } from '../utils/aiVerification';
import { dbGetAll, dbPut, dbPutBatch } from '../utils/indexedDB';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import { fetchLiveIncidentReports } from '../utils/liveIngestion';

const STORAGE_KEY = 'drishti_reports_live_v1';

export const useReports = (userLat = 20.4625, userLon = 85.8828) => {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial reports from live telemetry feeds and local IndexedDB user submissions
  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Fetch user's local submitted reports from IndexedDB (filter out legacy synthetic meteo reports)
      const rawUserReports = await dbGetAll<IncidentReport>('reports') || [];
      const userReports = rawUserReports.filter(r => !r.id.startsWith('LIVE-meteo-'));

      // 2. Fetch live real-time reports only for genuine Critical events
      let liveSensorReports: IncidentReport[] = [];
      if (navigator.onLine) {
        liveSensorReports = await fetchLiveIncidentReports(userLat, userLon);
      }

      // 3. Merge genuine reports
      const existingIds = new Set(userReports.map(r => r.id));
      const combined = [...userReports];
      
      for (const liveReport of liveSensorReports) {
        if (!existingIds.has(liveReport.id)) {
          combined.push(liveReport);
        }
      }

      setReports(combined);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      await dbPutBatch('reports', combined);
    } catch (e) {
      console.warn('Failed to load live reports, using local cache:', e);
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setReports(JSON.parse(cached));
      }
    } finally {
      setIsInitialized(true);
      setIsLoading(false);
    }
  }, [userLat, userLon]);

  useEffect(() => {
    loadReports();

    // Poll live sensor feeds every 60 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        loadReports();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [loadReports]);

  // Persist to both IndexedDB and localStorage whenever reports change
  useEffect(() => {
    if (isInitialized && reports.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
        dbPutBatch('reports', reports).catch(e => console.warn('IDB Batch save error:', e));
      } catch (e) {
        console.warn('Failed to persist reports cache:', e);
      }
    }
  }, [reports, isInitialized]);

  // Handle Offline/Online and Sync Event Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      offlineSyncManager.processSyncQueue();
      loadReports();
    };

    const handleOffline = () => setIsOffline(true);

    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{ syncedCount: number }>;
      if (customEvent.detail?.syncedCount > 0) {
        setReports(prev => prev.map(report => {
          if (report.status === 'PendingSync') {
            return {
              ...report,
              status: 'Submitted',
              verificationStatus: 'UnderReview'
            };
          }
          return report;
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('drishti-sync-complete', handleSyncComplete);

    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('drishti-sync-complete', handleSyncComplete);
    };
  }, [loadReports]);

  // Submit report with real-time local AI verification & automatic offline sync queueing
  const submitReport = useCallback(async (
    reportData: Omit<IncidentReport, 'id' | 'status' | 'verificationStatus' | 'timestamp' | 'aiAnalysis' | 'sourceInfo'> & { sourceInfo?: ReportSourceInfo }
  ) => {
    const defaultSource: ReportSourceInfo = reportData.sourceInfo || {
      platform: 'DRISHTI Web App',
      authorName: 'Citizen / Field Responder',
      authorHandle: '@drishti_field',
      verifiedUser: true,
      engagementStats: { shares: 1, corroborations: 1 }
    };

    // Run Instant In-Browser AI Agent Analysis (Works 100% Offline)
    const aiAnalysis = analyzeIncidentReport(
      reportData.type,
      reportData.locationName,
      reportData.coordinates,
      reportData.description,
      reportData.mediaBase64,
      reportData.urgency,
      reportData.tags,
      defaultSource
    );

    const isCurrentOffline = !navigator.onLine;

    // Report lifecycle:
    // Offline -> 'PendingSync' (verificationStatus: 'UnderReview')
    // Online -> 'Submitted' (verificationStatus: 'UnderReview')
    // Reports must NEVER automatically become 'Verified' upon submission or synchronization.
    const initialStatus = aiAnalysis.verdict === 'Avoid' 
      ? 'Avoid' 
      : isCurrentOffline
        ? 'PendingSync'
        : 'Submitted';

    const initialVerificationStatus = aiAnalysis.verdict === 'Avoid'
      ? 'Rejected'
      : 'UnderReview';

    const newReport: IncidentReport = {
      ...reportData,
      id: `DRISHTI-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`,
      timestamp: new Date().toISOString(),
      status: initialStatus,
      verificationStatus: initialVerificationStatus,
      responseStatus: 'Unassigned',
      sourceInfo: defaultSource,
      aiAnalysis
    };

    // Save to local IndexedDB immediately
    await dbPut('reports', newReport);

    // If offline, enqueue for cloud reconciliation
    if (isCurrentOffline) {
      await offlineSyncManager.enqueueAction('CREATE_REPORT', newReport);
    }

    setReports(prev => [newReport, ...prev]);
    return newReport;
  }, []);

  const updateReportStatus = useCallback((id: string, newStatus: IncidentReport['responseStatus']) => {
    setReports(prev => {
      const updated = prev.map(report => {
        if (report.id === id) {
          const mod = { ...report, responseStatus: newStatus };
          dbPut('reports', mod);
          return mod;
        }
        return report;
      });
      return updated;
    });
  }, []);

  const manuallyVerifyReport = useCallback((id: string, newVerdict: 'Genuine' | 'Avoid') => {
    setReports(prev => {
      const updated = prev.map(report => {
        if (report.id !== id) return report;
        const updatedAnalysis = report.aiAnalysis ? {
          ...report.aiAnalysis,
          verdict: newVerdict,
          confidenceLevel: (newVerdict === 'Genuine' ? 'High' : 'Low') as 'High' | 'Low',
          confidenceScore: newVerdict === 'Genuine' ? 95 : 15,
          reasoning: [
            `Manual Command Center Override by Operator: Marked as ${newVerdict.toUpperCase()}`,
            ...report.aiAnalysis.reasoning
          ]
        } : undefined;

        const mod: IncidentReport = {
          ...report,
          status: newVerdict === 'Genuine' ? 'Verified' : 'Avoid',
          verificationStatus: newVerdict === 'Genuine' ? 'Verified' : 'Rejected',
          responseStatus: newVerdict === 'Genuine' ? 'ResponderAssigned' : 'Unassigned',
          aiAnalysis: updatedAnalysis
        };

        dbPut('reports', mod);
        return mod;
      });
      return updated;
    });
  }, []);

  return {
    reports,
    loading: isLoading,
    isOffline,
    submitReport,
    updateReportStatus,
    manuallyVerifyReport,
    refreshReports: loadReports
  };
};
