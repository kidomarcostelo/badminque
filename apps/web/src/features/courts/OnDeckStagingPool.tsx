'use client';

import React from 'react';
import { formatDubr, ratingToDubr, type OnDeckMatchGroup, type RosterPlayer } from '@badminque/core';

export interface OnDeckStagingPoolProps {
  onDeckGroups: OnDeckMatchGroup[];
  onDispatchToCourt?: (slotIndex: number, targetCourtId?: number) => void;
  availableCourtIds?: number[];
}

interface SlotMeta {
  slotIndex: number;
  label: 'Next Up' | 'Following' | 'In the Hole';
  badgeStyle: string;
}

const SLOT_DEFINITIONS: SlotMeta[] = [
  {
    slotIndex: 1,
    label: 'Next Up',
    badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    slotIndex: 2,
    label: 'Following',
    badgeStyle: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
  },
  {
    slotIndex: 3,
    label: 'In the Hole',
    badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
];

function renderPlayerRow(player: RosterPlayer, teamColor: 'emerald' | 'amber'): React.JSX.Element {
  const dubrValue = player.doubles_dubr ?? ratingToDubr(player.doubles_rating);

  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="font-semibold text-slate-100 truncate max-w-[130px]">
        {player.name}
      </span>
      <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
        <span className="text-slate-400">{player.doubles_rating}</span>
        <span className="text-slate-600">•</span>
        <span className={teamColor === 'emerald' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
          DUBR: {formatDubr(dubrValue)}
        </span>
      </div>
    </div>
  );
}

export function OnDeckStagingPool({
  onDeckGroups,
  onDispatchToCourt,
}: OnDeckStagingPoolProps): React.JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span>🎯</span>
          <span>On-Deck Staging Pool</span>
        </h3>
        <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full font-bold">
          Pre-Grouped Pairs • 1-Tap Dispatch
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {SLOT_DEFINITIONS.map((def) => {
          const group = onDeckGroups.find((g) => g.slotIndex === def.slotIndex);

          if (!group) {
            return (
              <div
                key={`slot-${def.slotIndex}`}
                className="bg-slate-900/50 border border-slate-800/80 border-dashed rounded-xl p-4 flex flex-col justify-between min-h-[220px]"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Slot {def.slotIndex}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${def.badgeStyle}`}
                  >
                    {def.label}
                  </span>
                </div>
                <div className="my-auto text-center space-y-1 py-4">
                  <div className="text-slate-500 font-mono text-base">⏳</div>
                  <div className="text-xs font-bold text-slate-400">Awaiting Queue Backfill</div>
                  <p className="text-[11px] text-slate-400">
                    Needs 4 waiting players to form match
                  </p>
                </div>
              </div>
            );
          }

          const [playerA1, playerA2] = group.pairA;
          const [playerB1, playerB2] = group.pairB;

          return (
            <div
              key={`slot-${def.slotIndex}`}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between shadow-lg transition-all min-h-[220px]"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-extrabold border ${def.badgeStyle}`}
                  >
                    {group.label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">
                    Spread: <strong className="text-slate-200">{group.spread} RS</strong>
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {group.policy}
                </span>
              </div>

              <div className="my-2.5 space-y-2">
                {/* Team A */}
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-400 mb-1">
                    <span>Pair A</span>
                    <span className="font-mono">Avg: {group.pairARating}</span>
                  </div>
                  {renderPlayerRow(playerA1, 'emerald')}
                  {renderPlayerRow(playerA2, 'emerald')}
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-800/80 w-full" />
                  <span className="bg-slate-900 px-2 text-[10px] font-mono font-bold text-slate-400 uppercase">
                    VS
                  </span>
                  <div className="border-t border-slate-800/80 w-full" />
                </div>

                {/* Team B */}
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-amber-400 mb-1">
                    <span>Pair B</span>
                    <span className="font-mono">Avg: {group.pairBRating}</span>
                  </div>
                  {renderPlayerRow(playerB1, 'amber')}
                  {renderPlayerRow(playerB2, 'amber')}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => onDispatchToCourt?.(group.slotIndex)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-emerald-500/20"
                >
                  <span>⚡ Dispatch to Court</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
