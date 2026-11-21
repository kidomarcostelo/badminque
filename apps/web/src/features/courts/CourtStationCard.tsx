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
    border: 'border-amber-300',
    badge: 'bg-amber-50 text-amber-700 border-amber-300',
    dot: 'bg-amber-500 animate-pulse',
  },
  PROPOSED: {
    border: 'border-outline-variant',
    badge: 'bg-slate-100 text-slate-700 border-outline-variant',
    dot: 'bg-slate-500',
  },
  SCORE_ENTRY: {
    border: 'court-active',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    dot: 'bg-emerald-500',
  },
  IDLE: {
    border: 'border-outline-variant',
    badge: 'bg-slate-100 text-slate-500 border-outline-variant',
    dot: 'bg-slate-400',
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
        className={`silk-extruded rounded-xl border ${stateStyle.border} p-3 sm:p-4 flex flex-col justify-between shadow-xs min-h-[220px] transition-all`}
      >
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-outline-variant">
              KEY [{courtId}]
            </span>
            <span className="font-headline-sm text-sm font-extrabold uppercase text-slate-900 tracking-wide">
              {name}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono-badge font-bold border flex items-center gap-1.5 ${stateStyle.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${stateStyle.dot}`} />
            IDLE
          </span>
        </div>

        <div className="silk-sunken-shallow rounded-lg my-auto py-5 px-3 text-center space-y-1.5 border border-outline-variant">
          <div className="w-8 h-8 rounded-lg silk-extruded-sm border border-outline-variant mx-auto flex items-center justify-center text-slate-400 font-mono text-sm shadow-2xs">
            ⏱
          </div>
          <div className="text-sm font-headline-sm font-bold text-slate-900">Court Open for Next Match</div>
          <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto">
            Dispatch the Next Up pairing from the On-Deck Queue Pool or assemble a Custom Match.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant">
          <button
            type="button"
            onClick={() => onDispatch?.(courtId)}
            className="silk-btn-primary min-h-[34px] px-3 py-1.5 rounded-lg text-white font-headline-sm font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <span>⚡ Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => onCustomMatch?.(courtId)}
            className="silk-extruded-sm min-h-[34px] px-3 py-1.5 rounded-lg border border-outline-variant text-slate-800 font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
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
      className={`silk-extruded rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between shadow-xs transition-all relative ${
        state === 'SCORE_ENTRY' ? 'court-active' : stateStyle.border
      }`}
    >
      {state === 'SCORE_ENTRY' && (
        <div className="absolute -top-2 right-2 px-2 py-0.5 bg-primary text-white font-mono text-[8px] font-extrabold uppercase rounded-full shadow-md">
          URGENT ACTION
        </div>
      )}

      {/* Court Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-outline-variant pb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
              state === 'SCORE_ENTRY'
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-700 border border-outline-variant'
            }`}
          >
            KEY [{courtId}]
          </span>
          <h3 className="font-headline-sm text-sm font-extrabold uppercase text-slate-900 tracking-wide">
            {name}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {showTimer && (
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg border ${
                state === 'SCORE_ENTRY'
                  ? 'text-primary silk-sunken-shallow border-primary/20'
                  : 'text-amber-700 silk-sunken-shallow border-amber-200'
              }`}
            >
              {formatTimer(elapsedSeconds)}
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono-badge font-bold border flex items-center gap-1 ${stateStyle.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${stateStyle.dot}`} />
            {state}
          </span>
        </div>
      </div>

      {/* Balance Subtitle */}
      <div className="text-[10px] font-semibold text-on-surface-variant flex items-center gap-1.5 pt-1">
        <span>
          Spread: <strong className="text-slate-800 font-mono-data">{spread} RS</strong>
        </span>
        <span>•</span>
        <span className="text-emerald-600 font-bold">{balanceLabel}</span>
      </div>

      {/* Pairings Dense 2-Column Grid */}
      <div className="grid grid-cols-2 gap-2 my-2">
        {/* Team A */}
        <div className="silk-sunken-shallow p-2 rounded-lg border border-outline-variant flex flex-col justify-between">
          <div className="flex justify-between items-center text-[9px] text-on-surface-variant font-mono pb-1 mb-1 border-b border-outline-variant/60">
            <span className="text-slate-700 font-bold uppercase">Team A</span>
            <span className="text-indigo-600 font-bold">Avg {avgA}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="truncate font-bold text-slate-900 font-body-base max-w-[100px]">
                {playerA1.name}
              </span>
              <span className="font-mono text-[10px] text-slate-500 font-medium">
                {playerA1.doubles_rating}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="truncate font-bold text-slate-900 font-body-base max-w-[100px]">
                {playerA2.name}
              </span>
              <span className="font-mono text-[10px] text-slate-500 font-medium">
                {playerA2.doubles_rating}
              </span>
            </div>
          </div>
        </div>

        {/* Team B */}
        <div className="silk-sunken-shallow p-2 rounded-lg border border-outline-variant flex flex-col justify-between">
          <div className="flex justify-between items-center text-[9px] text-on-surface-variant font-mono pb-1 mb-1 border-b border-outline-variant/60">
            <span className="text-slate-700 font-bold uppercase">Team B</span>
            <span className="text-amber-600 font-bold">Avg {avgB}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="truncate font-bold text-slate-900 font-body-base max-w-[100px]">
                {playerB1.name}
              </span>
              <span className="font-mono text-[10px] text-slate-500 font-medium">
                {playerB1.doubles_rating}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="truncate font-bold text-slate-900 font-body-base max-w-[100px]">
                {playerB2.name}
              </span>
              <span className="font-mono text-[10px] text-slate-500 font-medium">
                {playerB2.doubles_rating}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="pt-2 border-t border-outline-variant flex items-center gap-1.5">
        {state === 'PROPOSED' ? (
          <>
            <button
              type="button"
              onClick={() => onDispatch?.(courtId)}
              className="h-8 flex-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span>⚡ Dispatch</span>
            </button>
            <button
              type="button"
              onClick={() => onCustomMatch?.(courtId)}
              className="h-8 px-2.5 rounded-lg silk-extruded-sm hover:bg-slate-100 text-slate-800 font-mono text-[11px] font-bold border border-outline-variant active:scale-95 transition-all cursor-pointer"
            >
              <span>Custom Match</span>
            </button>
            {onResetIdle && (
              <button
                type="button"
                onClick={() => onResetIdle(courtId)}
                title="Clear to Idle"
                aria-label="Clear to Idle"
                className="h-8 w-8 rounded-lg silk-extruded-sm hover:bg-slate-100 text-slate-600 border border-outline-variant flex items-center justify-center active:scale-95 transition-all cursor-pointer"
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
              className="h-8 flex-1 rounded-lg silk-btn-primary text-white font-headline-sm text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span>Enter Score (30 pts)</span>
            </button>
            <button
              type="button"
              onClick={() => onCustomMatch?.(courtId)}
              className="h-8 px-2.5 rounded-lg silk-extruded-sm hover:bg-slate-100 text-slate-800 font-mono text-[11px] font-bold border border-outline-variant active:scale-95 transition-all cursor-pointer"
            >
              <span>Custom Match</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
