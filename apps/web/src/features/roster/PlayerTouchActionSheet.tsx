'use client';

import React, { useState } from 'react';
import {
  formatDubr,
  ratingToDubr,
  type RosterPlayer,
} from '@badminque/core';
import type { CourtStationData } from '../courts/types';
import { PlayerStatusBadge } from './PlayerStatusBadge';

export interface PlayerTouchActionSheetProps {
  isOpen: boolean;
  player: RosterPlayer | null;
  roster: RosterPlayer[];
  courts: CourtStationData[];
  onClose: () => void;
  onAssignToCourt: (playerId: string, courtId: number) => void;
  onToggleSkip: (playerId: string) => void;
  onToggleRest: (playerId: string) => void;
  onPinPair: (playerAId: string, playerBId: string) => void;
  onUnpinPair: (playerId: string) => void;
}

export function PlayerTouchActionSheet({
  isOpen,
  player,
  roster,
  courts,
  onClose,
  onAssignToCourt,
  onToggleSkip,
  onToggleRest,
  onPinPair,
  onUnpinPair,
}: PlayerTouchActionSheetProps): React.JSX.Element | null {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');

  if (!isOpen || !player) {
    return null;
  }

  const potentialPartners = roster.filter(
    (other) => other.id !== player.id && !other.locked_partner_id
  );

  const isSkipped = player.is_skipped === true || player.status === 'SKIPPED';
  const isResting = player.status === 'RESTING';
  const isPinned = Boolean(player.locked_partner_id);

  const handlePin = (): void => {
    if (!selectedPartnerId) {
      return;
    }
    onPinPair(player.id, selectedPartnerId);
    setSelectedPartnerId('');
  };

  const dubrDisplay = formatDubr(player.doubles_dubr ?? ratingToDubr(player.doubles_rating));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-sheet-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border-t-2 sm:border-2 border-slate-700 rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                Player Quick Actions
              </span>
              <PlayerStatusBadge status={player.status} />
            </div>
            <h3 id="action-sheet-title" className="text-lg font-extrabold text-slate-100 mt-0.5">
              {player.name}
            </h3>
            <div className="text-xs font-mono text-slate-400 mt-0.5">
              Rating: <span className="text-slate-200">{player.doubles_rating}</span> • DUBR: <span className="text-emerald-400 font-bold">{dubrDisplay}</span> • Matches: {player.matches_played}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close action sheet"
            className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Action Controls Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* 1. Direct Court Assignment */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              1-Tap Court Assignment
            </div>
            <div className="grid grid-cols-3 gap-2">
              {courts.map((court) => {
                const canAssign = court.state === 'IDLE' || court.state === 'PROPOSED';
                return (
                  <button
                    key={court.courtId}
                    type="button"
                    disabled={!canAssign}
                    onClick={() => {
                      onAssignToCourt(player.id, court.courtId);
                      onClose();
                    }}
                    className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      canAssign
                        ? 'bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-100 border border-slate-700'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span>Send to Court {court.courtId}</span>
                    <span className="text-[10px] font-mono opacity-75">{court.state}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Breather & Rest Toggles */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Availability &amp; Rest
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onToggleSkip(player.id)}
                className={`min-h-[48px] px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                  isSkipped
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span>⏱</span>
                <span>{isSkipped ? 'Cancel 1-Match Skip' : '1-Match Skip (Breather)'}</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleRest(player.id)}
                className={`min-h-[48px] px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                  isResting
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span>💤</span>
                <span>{isResting ? 'Set to Ready' : 'Take Rest'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              1-Match Skip grants elevated priority boost (δ_skip) when returning for the next match.
            </p>
          </div>

          {/* 3. Locked Pair Pinning */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Locked Pair Pinning</span>
              <span className="text-[10px] font-mono text-slate-400">Fixed Doubles Partners</span>
            </div>

            {isPinned ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-emerald-400">
                    Pinned with {player.locked_partner_name ?? 'Partner'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Locked Pair Invariant active: queue arrival anchored to max(t_a, t_b).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUnpinPair(player.id)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  Unpin Pair
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  aria-label="Select partner to pin"
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="flex-1 min-h-[48px] px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Select available partner...</option>
                  {potentialPartners.map((other) => (
                    <option key={other.id} value={other.id}>
                      {other.name} ({other.doubles_rating})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!selectedPartnerId}
                  onClick={handlePin}
                  className="min-h-[48px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Pin Locked Pair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
