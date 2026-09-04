/**
 * DRISHTI Offline Sync Manager
 * Manages queued offline actions, auto-sync upon reconnection, and network state reconciliation.
 */

import { dbGetAll, dbPut, dbDelete } from './indexedDB';
import type { IncidentReport } from '../types/report';

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
          // Simulate / Execute backend synchronization
          if (item.action === 'CREATE_REPORT') {
            const report = item.payload as IncidentReport;
            // Transition status strictly from PendingSync -> Submitted (NEVER automatically Verified)
            const updatedReport: IncidentReport = {
              ...report,
              status: 'Submitted',
              verificationStatus: 'UnderReview'
            };
            await dbPut('reports', updatedReport);
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
