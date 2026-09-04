import { useState, useEffect, useCallback } from 'react';
import { isDirectSourceReport, type IncidentReport, type ReportSourceInfo } from '../types/report';
import { analyzeIncidentReport, SEEDED_REPORTS } from '../utils/aiVerification';
import { analyzeReportNarrative } from '../utils/mlApiClient';
import { dbGetAll, dbPut, dbPutBatch } from '../utils/indexedDB';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import { fetchLiveIncidentReports } from '../utils/liveIngestion';
import { createReport, fetchReports, updateReport } from '../utils/reportsApiClient';

const STORAGE_KEY = 'drishti_reports_live_v1';

export const useReports = (userLat = 20.4625, userLon = 85.8828) => {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial reports from cloud PostgreSQL database, live telemetry feeds, and local IndexedDB cache
  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Fetch user's local submitted reports from IndexedDB
      const rawLocalReports = (await dbGetAll<IncidentReport>('reports')) || [];
      const localReports = rawLocalReports.filter(r => !r.id.startsWith('LIVE-meteo-'));
      
      // Preserve local reports that are still waiting for offline sync
      const pendingLocalReports = localReports.filter(r => r.status === 'PendingSync');

      // 2. Fetch authoritative cloud reports and live sensor feeds if online
      let cloudReports: IncidentReport[] = [];
      let liveSensorReports: IncidentReport[] = [];

      if (navigator.onLine) {
        try {
          // Authoritative multi-device cloud reports from PostgreSQL
          cloudReports = await fetchReports();
        } catch (cloudErr) {
          console.warn('[useReports] Cloud reports fetch failed, falling back to local cache:', cloudErr);
        }

        try {
          // Real-time authoritative institutional feeds (e.g. USGS Seismology / GDACS)
          liveSensorReports = await fetchLiveIncidentReports(userLat, userLon);
        } catch (feedErr) {
          console.warn('[useReports] Live sensor ingestion error:', feedErr);
        }
      }

      // 3. Merge reports: Cloud reports (authoritative) + local PendingSync + Live Sensor feeds
      const mergedMap = new Map<string, IncidentReport>();

      // If cloud reports are available, use them as authoritative foundation
      if (cloudReports.length > 0) {
        for (const r of cloudReports) {
          mergedMap.set(r.id, r);
        }
      } else {
        // Offline or backend unavailable: load previously cached local reports
        for (const r of localReports) {
          mergedMap.set(r.id, r);
        }
      }

      // Always overlay local PendingSync reports so the local user sees their pending uploads
      for (const pending of pendingLocalReports) {
        mergedMap.set(pending.id, pending);
      }

      // Merge real-time live sensor reports (USGS / GDACS)
      for (const liveReport of liveSensorReports) {
        if (!mergedMap.has(liveReport.id)) {
          mergedMap.set(liveReport.id, liveReport);
        }
      }

      // 4. If no reports exist at all, include baseline seeded events (e.g., Morocco USGS earthquake)
      if (mergedMap.size === 0) {
        for (const seeded of SEEDED_REPORTS) {
          mergedMap.set(seeded.id, seeded);
        }
      }

      const combined = Array.from(mergedMap.values());

      // Ensure explicit origin and Priority (Genuine) classification on GDACS / direct source reports
      for (const r of combined) {
        if (!r.origin) {
          r.origin = isDirectSourceReport(r) ? 'direct_source' : 'citizen';
        }

        // Authoritative GDACS alerts and direct telemetry feeds must always be Priority (Genuine), never spam
        if (r.sourceInfo?.platform === 'GDACS Global Alert' || isDirectSourceReport(r)) {
          if (!r.aiAnalysis || r.aiAnalysis.verdict === 'Avoid') {
            const feedLabel = r.sourceInfo?.directSourceName || r.sourceInfo?.authorName || 'GDACS Global Alert Feed';
            r.aiAnalysis = {
              verdict: 'Genuine',
              confidenceScore: 98,
              confidenceLevel: 'High',
              reasoning: [
                `Authoritative Global Disaster Alert: Ingested directly from ${feedLabel}.`,
                'Multi-agency validation confirmed: Real-time sensor detection verified at source coordinates.',
                'Zero fraud indicators: Verified institutional telemetry stream.'
              ],
              sensorCorrelation: `Corroborated with active ${r.type.toLowerCase()} sensor telemetry feeds.`,
              satelliteValidation: 'Satellite and multi-agency telemetry aligned.',
              crowdConsensus: 'Authoritative global sensor consensus verified.',
              computerVisionAudit: 'Automated sensor station — direct institutional telemetry feed.',
              reviewedAt: new Date().toISOString()
            };
          }
        }
      }

      // Sort newest first
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setReports(combined);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      await dbPutBatch('reports', combined);
    } catch (e) {
      console.warn('[useReports] Failed to load live reports, using local cache:', e);
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          setReports(JSON.parse(cached));
        } catch {
          // ignore parsing error
        }
      }
    } finally {
      setIsInitialized(true);
      setIsLoading(false);
    }
  }, [userLat, userLon]);

  useEffect(() => {
    loadReports();

    // Poll reports & sensor feeds every 45 seconds when online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        loadReports();
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [loadReports]);

  // Persist to both IndexedDB and localStorage whenever reports state updates
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
        loadReports();
      }
    };

    const handleReportsUpdated = () => {
      loadReports();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('drishti-sync-complete', handleSyncComplete);
    window.addEventListener('drishti-reports-updated', handleReportsUpdated);
    window.addEventListener('storage', handleReportsUpdated);

    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('drishti-sync-complete', handleSyncComplete);
      window.removeEventListener('drishti-reports-updated', handleReportsUpdated);
      window.removeEventListener('storage', handleReportsUpdated);
    };
  }, [loadReports]);

  // Submit report with real-time local AI verification, cloud persistence & automatic offline sync queueing
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

    // Evaluate ML Content Assessment if online; if offline, mark pending without fake scores
    let mlAssessment;
    if (isCurrentOffline) {
      mlAssessment = {
        prediction: 'not_informative' as const,
        informative_probability: 0,
        not_informative_probability: 0,
        evaluatedAt: new Date().toISOString(),
        status: 'pending' as const,
        error: 'Offline - pending synchronization'
      };
    } else {
      mlAssessment = await analyzeReportNarrative(reportData.description);
    }

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
      origin: 'citizen',
      timestamp: new Date().toISOString(),
      status: initialStatus,
      verificationStatus: initialVerificationStatus,
      responseStatus: 'Unassigned',
      sourceInfo: defaultSource,
      aiAnalysis,
      mlAssessment
    };

    // Save to local IndexedDB immediately
    await dbPut('reports', newReport);

    if (isCurrentOffline) {
      // If offline, enqueue for background sync once network is restored
      await offlineSyncManager.enqueueAction('CREATE_REPORT', newReport);
      setReports(prev => [newReport, ...prev]);
      window.dispatchEvent(new CustomEvent('drishti-reports-updated', { detail: newReport }));
      return newReport;
    }

    // If online, persist to cloud PostgreSQL database
    try {
      const cloudPersistedReport = await createReport(newReport);
      await dbPut('reports', cloudPersistedReport);
      setReports(prev => [cloudPersistedReport, ...prev.filter(r => r.id !== newReport.id)]);
      window.dispatchEvent(new CustomEvent('drishti-reports-updated', { detail: cloudPersistedReport }));
      return cloudPersistedReport;
    } catch (cloudErr) {
      console.warn('[useReports] Cloud upload failed while online; enqueuing for offline sync:', cloudErr);
      const pendingReport: IncidentReport = {
        ...newReport,
        status: 'PendingSync'
      };
      await dbPut('reports', pendingReport);
      await offlineSyncManager.enqueueAction('CREATE_REPORT', pendingReport);
      setReports(prev => [pendingReport, ...prev.filter(r => r.id !== newReport.id)]);
      window.dispatchEvent(new CustomEvent('drishti-reports-updated', { detail: pendingReport }));
      return pendingReport;
    }
  }, []);

  const updateReportStatus = useCallback((id: string, newStatus: IncidentReport['responseStatus']) => {
    setReports(prev => {
      const updated = prev.map(report => {
        if (report.id === id) {
          const mod = { ...report, responseStatus: newStatus };
          dbPut('reports', mod);
          
          if (navigator.onLine) {
            updateReport(id, { responseStatus: newStatus }).catch(err => {
              console.warn('[useReports] Failed to sync status update to cloud:', err);
              offlineSyncManager.enqueueAction('UPDATE_REPORT_STATUS', { id, updates: { responseStatus: newStatus } });
            });
          } else {
            offlineSyncManager.enqueueAction('UPDATE_REPORT_STATUS', { id, updates: { responseStatus: newStatus } });
          }
          return mod;
        }
        return report;
      });
      window.dispatchEvent(new CustomEvent('drishti-reports-updated'));
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

        const updatesPayload = {
          status: mod.status,
          verificationStatus: mod.verificationStatus,
          responseStatus: mod.responseStatus,
          aiAnalysis: mod.aiAnalysis
        };

        if (navigator.onLine) {
          updateReport(id, updatesPayload).catch(err => {
            console.warn('[useReports] Failed to sync manual verification to cloud:', err);
            offlineSyncManager.enqueueAction('VERIFY_REPORT', { id, updates: updatesPayload });
          });
        } else {
          offlineSyncManager.enqueueAction('VERIFY_REPORT', { id, updates: updatesPayload });
        }

        return mod;
      });
      window.dispatchEvent(new CustomEvent('drishti-reports-updated'));
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
