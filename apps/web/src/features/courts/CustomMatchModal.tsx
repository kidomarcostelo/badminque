'use client';

import React, { useMemo, useState } from 'react';
import type { RosterPlayer } from '@badminque/core';
import { getPairAverage, getSpread } from './types';

export interface CustomMatchModalProps {
  isOpen: boolean;
  courtId: number;
  availablePlayers: RosterPlayer[];
  onClose: () => void;
  onConfirmMatch: (
    courtId: number,
    teamA: [RosterPlayer, RosterPlayer],
    teamB: [RosterPlayer, RosterPlayer]
  ) => void;
}

export function CustomMatchModal({
  isOpen,
  courtId,
  availablePlayers,
  onClose,
  onConfirmMatch,
}: CustomMatchModalProps): React.JSX.Element | null {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const playerMap = useMemo(() => {
    return new Map<string, RosterPlayer>(
      availablePlayers.map((player) => [player.id, player])
    );
  }, [availablePlayers]);

  const selectedPlayers = useMemo(() => {
    return selectedPlayerIds
      .map((id) => playerMap.get(id))
      .filter((p): p is RosterPlayer => Boolean(p));
  }, [selectedPlayerIds, playerMap]);

  if (!isOpen) {
    return null;
  }

  const teamAPlayers = selectedPlayers.slice(0, 2);
  const teamBPlayers = selectedPlayers.slice(2, 4);

  const teamAPair: [RosterPlayer, RosterPlayer] | null =
    teamAPlayers.length === 2 && teamAPlayers[0] && teamAPlayers[1]
      ? [teamAPlayers[0], teamAPlayers[1]]
      : null;

  const teamBPair: [RosterPlayer, RosterPlayer] | null =
    teamBPlayers.length === 2 && teamBPlayers[0] && teamBPlayers[1]
      ? [teamBPlayers[0], teamBPlayers[1]]
      : null;

  const avgA = teamAPair ? getPairAverage(teamAPair) : null;
  const avgB = teamBPair ? getPairAverage(teamBPair) : null;
  const spread = teamAPair && teamBPair ? getSpread(teamAPair, teamBPair) : null;

  const isComplete = selectedPlayers.length === 4;

  const handleTogglePlayer = (playerId: string): void => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== playerId));
      return;
    }
    if (selectedPlayerIds.length < 4) {
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  const handleRemoveSlot = (slotIndex: number): void => {
    const updated = [...selectedPlayerIds];
    updated.splice(slotIndex, 1);
    setSelectedPlayerIds(updated);
  };

  const handleAutoPickTop4 = (): void => {
    const queued = availablePlayers.filter((p) => p.status === 'QUEUED');
    const pool = queued.length >= 4 ? queued : availablePlayers;
    const sorted = [...pool].sort((firstPlayer, secondPlayer) => {
      return secondPlayer.doubles_rating - firstPlayer.doubles_rating;
    });
    const top4 = sorted.slice(0, 4);
    setSelectedPlayerIds(top4.map((p) => p.id));
  };

  const handleAutoBalance = (): void => {
    if (selectedPlayers.length !== 4) {
      return;
    }
    const sorted = [...selectedPlayers].sort((firstPlayer, secondPlayer) => {
      return secondPlayer.doubles_rating - firstPlayer.doubles_rating;
    });
    const p1 = sorted[0];
    const p2 = sorted[1];
    const p3 = sorted[2];
    const p4 = sorted[3];
    if (p1 && p2 && p3 && p4) {
      // 1+4 vs 2+3 pairing
      setSelectedPlayerIds([p1.id, p4.id, p2.id, p3.id]);
    }
  };

  const handleSwapPartners = (): void => {
    if (selectedPlayers.length !== 4) {
      return;
    }
    const [id0, id1, id2, id3] = selectedPlayerIds;
    if (id0 && id1 && id2 && id3) {
      setSelectedPlayerIds([id0, id2, id1, id3]);
    }
  };

  const handleConfirm = (): void => {
    if (!teamAPair || !teamBPair) {
      return;
    }
    onConfirmMatch(courtId, teamAPair, teamBPair);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-match-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 id="custom-match-title" className="text-lg font-extrabold text-slate-100">
              Assemble Custom Match
            </h3>
            <p className="text-xs text-slate-400">
              Select 4 Roster Players for <span className="font-semibold text-slate-200">Court {courtId}</span> (Pair A vs Pair B)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer transition-colors hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Pairing preview */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>Staged Pairing Preview</span>
                {spread !== null && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-mono text-[11px] text-emerald-400">
                    Spread: Δ {spread} RS
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAutoBalance}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  ⚖ Auto-Balance
                </button>
                <button
                  type="button"
                  onClick={handleSwapPartners}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  ⇄ Swap Partners
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-emerald-400">
                  <span>Pair A</span>
                  <span className="font-mono">{avgA ? `Avg ${avgA}` : '—'}</span>
                </div>
                {[0, 1].map((slotIdx) => {
                  const pid = selectedPlayerIds[slotIdx];
                  const player = pid ? playerMap.get(pid) : null;
                  if (player) {
                    return (
                      <button
                        key={slotIdx}
                        type="button"
                        onClick={() => handleRemoveSlot(slotIdx)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-slate-950 border-emerald-500/40 text-emerald-400 text-xs flex items-center justify-between font-bold cursor-pointer"
                      >
                        <span className="text-slate-100 truncate">{player.name}</span>
                        <span className="font-mono text-[11px]">{player.doubles_rating}</span>
                      </button>
                    );
                  }
                  return (
                    <div
                      key={slotIdx}
                      className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-800 bg-slate-950/50 text-xs text-slate-500"
                    >
                      Tap player for Pair A #{slotIdx + 1}
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/40 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-amber-400">
                  <span>Pair B</span>
                  <span className="font-mono">{avgB ? `Avg ${avgB}` : '—'}</span>
                </div>
                {[2, 3].map((slotIdx) => {
                  const pid = selectedPlayerIds[slotIdx];
                  const player = pid ? playerMap.get(pid) : null;
                  if (player) {
                    return (
                      <button
                        key={slotIdx}
                        type="button"
                        onClick={() => handleRemoveSlot(slotIdx)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-slate-950 border-amber-500/40 text-amber-400 text-xs flex items-center justify-between font-bold cursor-pointer"
                      >
                        <span className="text-slate-100 truncate">{player.name}</span>
                        <span className="font-mono text-[11px]">{player.doubles_rating}</span>
                      </button>
                    );
                  }
                  return (
                    <div
                      key={slotIdx}
                      className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-800 bg-slate-950/50 text-xs text-slate-500"
                    >
                      Tap player for Pair B #{slotIdx - 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>
              Tap 4 Available Roster Players (
              <span className="text-emerald-400 font-mono">{selectedPlayers.length}</span>/4 selected)
            </span>
            <button
              type="button"
              onClick={handleAutoPickTop4}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              Auto-Pick Top 4
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {availablePlayers.map((player) => {
              const selectedIndex = selectedPlayerIds.indexOf(player.id);
              const isSelected = selectedIndex !== -1;
              const isPairA = selectedIndex === 0 || selectedIndex === 1;

              let buttonColor = 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700';
              if (isSelected && isPairA) {
                buttonColor = 'bg-emerald-500/20 border-emerald-500 text-slate-100';
              } else if (isSelected && !isPairA) {
                buttonColor = 'bg-amber-500/20 border-amber-500 text-slate-100';
              }

              let tagText = '';
              let tagColor = 'w-6 h-6 border-slate-700';
              if (isSelected && isPairA) {
                tagText = 'PAIR A';
                tagColor = 'bg-emerald-500 border-emerald-400 text-slate-950';
              } else if (isSelected && !isPairA) {
                tagText = 'PAIR B';
                tagColor = 'bg-amber-500 border-amber-400 text-slate-950';
              }

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => handleTogglePlayer(player.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${buttonColor}`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-extrabold truncate">{player.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {player.doubles_rating} RS • {player.status}
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-md border flex items-center justify-center shrink-0 font-mono font-extrabold text-[10px] ${tagColor}`}
                  >
                    {tagText}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isComplete}
              onClick={handleConfirm}
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:cursor-not-allowed"
            >
              <span>Stage Custom Match on Court {courtId}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
