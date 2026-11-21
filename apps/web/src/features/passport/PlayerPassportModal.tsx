'use client';

import React from 'react';
import {
  formatDubr,
  ratingToDubr,
  type RosterPlayer,
} from '@badminque/core';

export interface PlayerPassportModalProps {
  isOpen: boolean;
  player: RosterPlayer | null;
  onClose: () => void;
}

export function PlayerPassportModal({
  isOpen,
  player,
  onClose,
}: PlayerPassportModalProps): React.JSX.Element | null {
  if (!isOpen || !player) {
    return null;
  }

  const isClaimed = Boolean(player.auth_user_id);
  const singlesMatches = player.singles_matches_played ?? 0;
  const doublesMatches =
    player.doubles_matches_played ?? player.matches_played ?? 0;
  const totalMatches =
    player.matches_played ?? (singlesMatches + doublesMatches);
  const isEstablished = totalMatches >= 8;

  const singlesIsEstablished =
    player.singles_is_provisional === false || singlesMatches >= 8;
  const doublesIsEstablished =
    player.doubles_is_provisional === false || doublesMatches >= 8;

  const singlesIsSeeded = Boolean(
    player.singles_is_seeded ||
      (singlesMatches === 0 && doublesIsEstablished)
  );
  const doublesIsSeeded = Boolean(
    player.doubles_is_seeded ||
      (doublesMatches === 0 && singlesIsEstablished)
  );

  const singlesDubr = formatDubr(
    player.singles_dubr ?? ratingToDubr(player.singles_rating ?? 1500)
  );
  const doublesDubr = formatDubr(
    player.doubles_dubr ?? ratingToDubr(player.doubles_rating ?? 1500)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="passport-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-extrabold text-sm">
              🏸
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                Universal Identity
              </span>
              <h3 id="passport-modal-title" className="text-base font-extrabold text-slate-100">
                Player Passport
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close passport modal"
            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Passport Body */}
        <div className="p-6 space-y-6">
          {/* Identity Header */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                    isClaimed
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {isClaimed ? 'Claimed Player' : 'Roster Player (Unclaimed)'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ID: {player.id.slice(0, 8)}...
                </span>
              </div>
              <h4 className="text-xl font-extrabold text-slate-100 mt-1">{player.name}</h4>
            </div>

            <div className="text-right">
              <span
                className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-xl border ${
                  isEstablished
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                }`}
              >
                {isEstablished ? 'Established Player' : `Provisional (${totalMatches}/8)`}
              </span>
            </div>
          </div>

          {/* Ratings Grid (Independent Disciplines) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Doubles Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  Doubles Rating ($R_D$)
                </span>
                <div className="flex items-center gap-1.5">
                  {doublesIsSeeded && (
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300">
                      Seeded from Singles
                    </span>
                  )}
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                      doublesIsEstablished
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {doublesIsEstablished ? 'Established' : `Provisional (${doublesMatches}/8)`}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-mono font-extrabold text-slate-100">
                  {player.doubles_rating}
                </span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {doublesDubr} DUBR
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {doublesMatches} matches
              </div>
            </div>

            {/* Singles Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  Singles Rating ($R_S$)
                </span>
                <div className="flex items-center gap-1.5">
                  {singlesIsSeeded && (
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300">
                      Seeded from Doubles
                    </span>
                  )}
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                      singlesIsEstablished
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {singlesIsEstablished ? 'Established' : `Provisional (${singlesMatches}/8)`}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-mono font-extrabold text-slate-100">
                  {player.singles_rating}
                </span>
                <span className="text-sm font-mono font-bold text-sky-400">
                  {singlesDubr} DUBR
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {singlesMatches} matches
              </div>
            </div>
          </div>

          {/* Milestone Status Bar */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">8-Match Graduation Milestone</span>
              <span className="font-mono text-emerald-400 font-bold">
                {Math.min(totalMatches, 8)} / 8
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalMatches / 8) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400">
              {isEstablished
                ? '✓ Rating uncertainty resolved. Player eligible for official Club Night leaderboard.'
                : 'Provisional dynamics active (high K-factor decay scaling).'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
