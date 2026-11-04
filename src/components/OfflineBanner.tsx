import React, { useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getLastSyncTime } from '../utils/storage';

interface OfflineBannerProps {
  onSync?: () => Promise<void>;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onSync }) => {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const lastSync = getLastSyncTime();

  if (isOnline && !syncSuccess) return null;

  const handleManualSync = async () => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch {
      // offline or error
    } finally {
      setIsSyncing(false);
    }
  };

  if (syncSuccess) {
    return (
      <aside aria-label="Sync success banner" className="bg-emerald-950/80 border-b border-emerald-800 text-emerald-200 px-4 py-2 text-xs flex items-center justify-between no-print backdrop-blur-md">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Timetable synchronized successfully with university server.</span>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Offline status banner" className="bg-amber-950/90 border-b border-amber-800 text-amber-200 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 no-print backdrop-blur-md">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <span>
          <strong>Offline Mode Active:</strong> Displaying cached timetable. Reminders for previously loaded classes remain active locally.
        </span>
      </div>
      <div className="flex items-center gap-3 font-mono text-[11px]">
        <span className="text-amber-300/70 hidden sm:inline">Last Sync: {new Date(lastSync).toLocaleTimeString()}</span>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-100 border border-amber-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Checking...' : 'Check Connection'}</span>
        </button>
      </div>
    </aside>
  );
};
