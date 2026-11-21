'use client';

import React from 'react';

export interface SyncStatusIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncError?: string | null;
  onSyncNow: () => void | Promise<unknown>;
}

export function SyncStatusIndicator({
  isOnline,
  isSyncing,
  pendingCount,
  syncError,
  onSyncNow,
}: SyncStatusIndicatorProps): React.JSX.Element {
  let statusText = '';
  let dotColor = '';

  if (isSyncing) {
    statusText = 'Syncing...';
    dotColor = 'bg-sky-400 animate-ping';
  } else if (!isOnline) {
    statusText = `Offline (${pendingCount} Pending)`;
    dotColor = 'bg-rose-500';
  } else if (pendingCount === 0) {
    statusText = 'Online (Synced)';
    dotColor = 'bg-emerald-400';
  } else {
    statusText = `Online (${pendingCount} Pending)`;
    dotColor = 'bg-amber-400';
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-xs font-mono">
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isSyncing ? 'bg-sky-400' : !isOnline ? 'bg-rose-500' : pendingCount === 0 ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
        </span>

        <span className="font-semibold text-slate-200">
          {statusText}
        </span>

        {isOnline && !isSyncing && pendingCount > 0 && (
          <button
            type="button"
            onClick={() => void onSyncNow()}
            aria-label="Sync now"
            className="ml-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-sans font-extrabold shadow-sm transition cursor-pointer"
          >
            Sync Now
          </button>
        )}
      </div>

      {syncError && (
        <span
          role="alert"
          className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg max-w-[240px] truncate"
          title={syncError}
        >
          {syncError}
        </span>
      )}
    </div>
  );
}
