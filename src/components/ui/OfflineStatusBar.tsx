import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useConnectivity } from '../../hooks/useConnectivity';

export const OfflineStatusBar: React.FC = () => {
  const { status, isOffline, pendingSyncCount, triggerSync } = useConnectivity();
  const [showReconnected, setShowReconnected] = useState(false);
  const [prevOffline, setPrevOffline] = useState(isOffline);

  useEffect(() => {
    if (prevOffline && !isOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    }
    setPrevOffline(isOffline);
  }, [isOffline, prevOffline]);

  const isVisible = isOffline || pendingSyncCount > 0 || status === 'SYNCING' || showReconnected;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.2 }}
          className="w-full sticky top-0 z-50 px-3 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs border-b shadow-md backdrop-blur-md"
          style={{
            backgroundColor: isOffline 
              ? 'rgba(234, 88, 12, 0.92)' 
              : status === 'SYNCING'
                ? 'rgba(37, 99, 235, 0.92)'
                : 'rgba(16, 185, 129, 0.92)',
            borderColor: isOffline
              ? 'rgba(249, 115, 22, 0.5)'
              : status === 'SYNCING'
                ? 'rgba(96, 165, 250, 0.5)'
                : 'rgba(52, 211, 153, 0.5)',
            color: '#ffffff'
          }}
        >
          <div className="flex items-center gap-2 max-w-full overflow-hidden flex-1 min-w-0">
            {isOffline ? (
              <span className="p-1 rounded bg-black/20 text-white flex-shrink-0">
                <WifiOff size={14} />
              </span>
            ) : status === 'SYNCING' ? (
              <span className="p-1 rounded bg-black/20 text-white flex-shrink-0 animate-spin">
                <RefreshCw size={14} />
              </span>
            ) : (
              <span className="p-1 rounded bg-black/20 text-white flex-shrink-0">
                <CheckCircle2 size={14} />
              </span>
            )}

            <div className="flex items-center gap-2 truncate min-w-0">
              <span className="font-bold tracking-wider uppercase text-[11px] flex items-center gap-1.5 flex-shrink-0">
                {isOffline ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                    OFFLINE MODE
                  </>
                ) : status === 'SYNCING' ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
                    SYNCHRONIZING...
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-200" />
                    CONNECTED
                  </>
                )}
              </span>
              <span className="text-white/60 hidden sm:inline">•</span>
              <span className="text-white/95 text-[11px] truncate hidden xs:inline">
                {isOffline
                  ? 'Live data unavailable. Showing cached/last synchronized information.'
                  : status === 'SYNCING'
                    ? 'Synchronizing queued reports with emergency network...'
                    : 'Connection restored. Telemetry feeds active.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {pendingSyncCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/30 text-amber-100 border border-white/20 flex items-center gap-1">
                <CloudUpload size={11} />
                {pendingSyncCount} {pendingSyncCount === 1 ? 'report to sync' : 'reports to sync'}
              </span>
            )}

            {!isOffline && pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={triggerSync}
                className="px-3 py-1.5 min-h-[32px] rounded bg-white text-slate-900 font-bold text-[11px] hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <RefreshCw size={11} className={status === 'SYNCING' ? 'animate-spin' : ''} />
                Sync Now
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineStatusBar;
