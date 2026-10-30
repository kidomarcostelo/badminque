'use client';

import React from 'react';
import type { CourtState } from '@badminque/core';
import {
  formatTimer,
  getMatchBalanceLabel,
  getPairAverage,
  getSpread,
  type CourtStationData,
} from './types';

export interface CourtStationCardProps {
  court: CourtStationData;
  onDispatch?: (courtId: number) => void;
  onEnterScore?: (courtId: number) => void;
  onCustomMatch?: (courtId: number) => void;
  onResetIdle?: (courtId: number) => void;
}

interface StateBadgeStyle {
  border: string;
  badge: string;
  dot: string;
}

const STATE_STYLE_MAP: Record<CourtState, StateBadgeStyle> = {
  IN_MATCH: {
    border: 'border-emerald-500/70',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dot: 'bg-emerald-400 animate-pulse',
  },
  PROPOSED: {
    border: 'border-amber-500/70',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-400',
  },
  SCORE_ENTRY: {
    border: 'border-sky-400',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
    dot: 'bg-sky-400 animate-ping',
  },
  IDLE: {
    border: 'border-slate-800',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
    dot: 'bg-slate-500',
  },
};

export function CourtStationCard({
  court,
  onDispatch,
  onEnterScore,
  onCustomMatch,
  onResetIdle,
}: CourtStationCardProps): React.JSX.Element {
  const { courtId, name, state, elapsedSeconds, teamA, teamB } = court;
  const stateStyle = STATE_STYLE_MAP[state];

  if (state === 'IDLE' || !teamA || !teamB) {
    return (
      <div
        className={`bg-slate-900/90 border-2 ${stateStyle.border} rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl min-h-[330px]`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="font-mono font-extrabold text-base text-slate-200">{name}</span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${stateStyle.badge}`}
          >
            <span className={`w-2 h-2 rounded-full ${stateStyle.dot}`} />
            IDLE
          </span>
        </div>

        <div className="my-auto py-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400 font-mono text-xl">
            ⏱
          </div>
          <div className="text-base font-bold text-slate-200">Court Open for Next Match</div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Dispatch the Next Up pairing from the On-Deck Queue Pool or assemble a Custom Match.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onDispatch?.(courtId)}
            className="min-h-[50px] px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>⚡ Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => onCustomMatch?.(courtId)}
            className="min-h-[50px] px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Custom Match</span>
          </button>
        </div>
      </div>
    );
  }

  const [playerA1, playerA2] = teamA;
  const [playerB1, playerB2] = teamB;
  const avgA = getPairAverage(teamA);
  const avgB = getPairAverage(teamB);
  const spread = getSpread(teamA, teamB);
  const balanceLabel = getMatchBalanceLabel(spread);
  const showTimer = state === 'IN_MATCH' || state === 'SCORE_ENTRY';

  return (
    <div
      className={`bg-slate-900 border-2 ${stateStyle.border} rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-mono font-extrabold text-base text-slate-100">{name}</h3>
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2 mt-0.5">
            <span>
              Spread: <strong className="text-slate-200 font-mono">{spread} RS</strong>
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">{balanceLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showTimer && (
            <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
              <span>⏱</span>
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          )}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-extrabold border flex items-center gap-1.5 ${stateStyle.badge}`}
          >
            <span className={`w-2 h-2 rounded-full ${stateStyle.dot}`} />
            {state}
          </span>
        </div>
      </div>

      <div className="my-4 space-y-2.5">
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Team A
              </span>
              <span className="text-sm font-bold text-slate-100 truncate">{playerA1.name}</span>
              <span className="text-xs font-mono text-slate-400">{playerA1.doubles_rating}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded opacity-0">
                Team A
              </span>
              <span className="text-sm font-bold text-slate-100 truncate">{playerA2.name}</span>
              <span className="text-xs font-mono text-slate-400">{playerA2.doubles_rating}</span>
            </div>
          </div>
          <div className="text-right shrink-0 pl-2 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Pair Avg</div>
            <div className="text-base font-mono font-extrabold text-emerald-400">{avgA}</div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-mono font-extrabold text-slate-400 uppercase tracking-widest">
            VS
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Team B
              </span>
              <span className="text-sm font-bold text-slate-100 truncate">{playerB1.name}</span>
              <span className="text-xs font-mono text-slate-400">{playerB1.doubles_rating}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded opacity-0">
                Team B
              </span>
              <span className="text-sm font-bold text-slate-100 truncate">{playerB2.name}</span>
              <span className="text-xs font-mono text-slate-400">{playerB2.doubles_rating}</span>
            </div>
          </div>
          <div className="text-right shrink-0 pl-2 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Pair Avg</div>
            <div className="text-base font-mono font-extrabold text-amber-400">{avgB}</div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
        {state === 'PROPOSED' ? (
          <>
            <button
              type="button"
              onClick={() => onDispatch?.(courtId)}
              className="flex-1 min-h-[50px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>⚡ Dispatch</span>
            </button>
            <button
              type="button"
              onClick={() => onCustomMatch?.(courtId)}
              className="min-h-[50px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Custom Match</span>
            </button>
            {onResetIdle && (
              <button
                type="button"
                onClick={() => onResetIdle(courtId)}
                title="Clear to Idle"
                aria-label="Clear to Idle"
                className="min-h-[50px] px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                ↺
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEnterScore?.(courtId)}
              className="flex-1 min-h-[50px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-emerald-500/20"
            >
              <span>Enter Score (30 pts)</span>
            </button>
            <button
              type="button"
              onClick={() => onCustomMatch?.(courtId)}
              className="min-h-[50px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Custom Match</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
