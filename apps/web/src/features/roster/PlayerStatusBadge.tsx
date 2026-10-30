import React from 'react';
import type { PlayerState } from '@badminque/core';

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_CONFIG_MAP: Record<PlayerState, StatusConfig> = {
  QUEUED: {
    label: 'QUEUED',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  PLAYING: {
    label: 'PLAYING',
    className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  RESTING: {
    label: 'RESTING',
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
  SKIPPED: {
    label: 'SKIPPED',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  WAITING_PARTNER: {
    label: 'WAITING',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
};

export interface PlayerStatusBadgeProps {
  status: PlayerState;
}

export function PlayerStatusBadge({ status }: PlayerStatusBadgeProps): React.JSX.Element {
  const config = STATUS_CONFIG_MAP[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
