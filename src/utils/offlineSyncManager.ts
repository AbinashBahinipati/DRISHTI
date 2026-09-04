/**
 * DRISHTI Offline Sync Manager
 * Manages queued offline actions, auto-sync upon reconnection, and network state reconciliation.
 */

import { dbGetAll, dbPut, dbDelete } from './indexedDB';
import type { IncidentReport } from '../types/report';
import { analyzeReportNarrative } from './mlApiClient';
import { createReport, updateReport } from './reportsApiClient';

export interface SyncQueueItem {
  id?: number;
  action: 'CREATE_REPORT' | 'UPDATE_REPORT_STATUS' | 'VERIFY_REPORT' | 'ACKNOWLEDGE_ALERT';
  payload: any;
  timestamp: string;
}

class OfflineSyncManager {
  private isSyncing = false;
  private syncListeners: ((pendingCount: number) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processSyncQueue();
      });
    }
  }

  /**
   * Add mutation to the offline sync queue
   */
  async enqueueAction(action: SyncQueueItem['action'], payload: any): Promise<void> {
    const queueItem: SyncQueueItem = {
      action,
      payload,
      timestamp: new Date().toISOString()
    };
    await dbPut('sync_queue', queueItem);
    this.notifyListeners();
  }

  /**
   * Get total number of pending items waiting to sync
   */
  async getPendingCount(): Promise<number> {
    try {
      const items = await dbGetAll<SyncQueueItem>('sync_queue');
      return items.length;
    } catch {
      return 0;
    }
  }

  /**
   * Process all queued offline actions when internet is restored
   */
  async processSyncQueue(): Promise<{ syncedCount: number; errors: any[] }> {
    if (this.isSyncing || !navigator.onLine) {
      return { syncedCount: 0, errors: [] };
    }

    this.isSyncing = true;
    const errors: any[] = [];
    let syncedCount = 0;

    try {
      const queue = await dbGetAll<SyncQueueItem>('sync_queue');

      for (const item of queue) {
        try {
          // Reconcile and synchronize offline report with backend
          if (item.action === 'CREATE_REPORT') {
            const report = item.payload as IncidentReport;

            // Run DRISHTI ML assessment now that connection is established
            let mlAssessment = report.mlAssessment;
            if (!mlAssessment || mlAssessment.status === 'pending') {
              try {
                mlAssessment = await analyzeReportNarrative(report.description);
              } catch (mlErr) {
                console.warn('[OfflineSync] Could not run ML assessment during sync:', mlErr);
                mlAssessment = {
                  prediction: 'not_informative',
                  informative_probability: 0,
                  not_informative_probability: 0,
                  evaluatedAt: new Date().toISOString(),
                  status: 'unavailable',
                  error: 'ML service unreachable during sync'
                };
              }
            }

            // Transition status strictly from PendingSync -> Submitted (NEVER automatically Verified)
            const updatedReport: IncidentReport = {
              ...report,
              origin: report.origin || 'citizen',
              status: 'Submitted',
              verificationStatus: 'UnderReview',
              mlAssessment
            };

            // Synchronize with central PostgreSQL Cloud database
            try {
              await createReport(updatedReport);
            } catch (cloudErr) {
              console.warn('[OfflineSync] Cloud upload failed; will retry next sync cycle:', cloudErr);
              throw cloudErr;
            }

            // Update local IndexedDB
            await dbPut('reports', updatedReport);
          } else if (item.action === 'UPDATE_REPORT_STATUS' || item.action === 'VERIFY_REPORT') {
            const { id, updates } = item.payload;
            if (id && updates) {
              try {
                await updateReport(id, updates);
              } catch (cloudErr) {
                console.warn('[OfflineSync] Cloud update failed; will retry next sync cycle:', cloudErr);
                throw cloudErr;
              }
            }
          }

          if (item.id !== undefined) {
            await dbDelete('sync_queue', item.id);
          }
          syncedCount++;
        } catch (err) {
          errors.push({ item, err });
        }
      }

      if (syncedCount > 0) {
        window.dispatchEvent(new CustomEvent('drishti-sync-complete', { 
          detail: { syncedCount } 
        }));
      }
    } catch (e) {
      console.warn('[DRISHTI Sync Manager] Failed processing sync queue:', e);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return { syncedCount, errors };
  }

  /**
   * Subscribe to sync queue changes
   */
  subscribe(listener: (pendingCount: number) => void): () => void {
    this.syncListeners.push(listener);
    this.getPendingCount().then(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private async notifyListeners() {
    const count = await this.getPendingCount();
    this.syncListeners.forEach(l => l(count));
  }
}

export const offlineSyncManager = new OfflineSyncManager();
