'use client';

import React from 'react';
import { formatDubr, ratingToDubr, type OnDeckMatchGroup, type RosterPlayer } from '@badminque/core';

export interface OnDeckStagingPoolProps {
  onDeckGroups: OnDeckMatchGroup[];
  onDispatchToCourt?: (slotIndex: number, targetCourtId?: number) => void;
  availableCourtIds?: number[];
  onOpenCustomBuilder?: (slotIndex: number) => void;
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
    badgeStyle: 'bg-indigo-600 text-white font-extrabold uppercase',
  },
  {
    slotIndex: 2,
    label: 'Following',
    badgeStyle: 'bg-sky-100 text-sky-700 font-bold uppercase border border-sky-300',
  },
  {
    slotIndex: 3,
    label: 'In the Hole',
    badgeStyle: 'bg-amber-100 text-amber-800 font-bold uppercase border border-amber-300',
  },
];

function renderPlayerRow(player: RosterPlayer, teamColor: 'emerald' | 'amber'): React.JSX.Element {
  const dubrValue = player.doubles_dubr ?? ratingToDubr(player.doubles_rating);

  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span className="font-semibold text-slate-800 truncate max-w-[120px] font-body-base">
        {player.name}
      </span>
      <div className="flex items-center gap-1.5 font-mono text-[10px] shrink-0">
        <span className="text-slate-500">{player.doubles_rating}</span>
        <span className="text-slate-300">•</span>
        <span className={teamColor === 'emerald' ? 'text-indigo-600 font-bold' : 'text-amber-700 font-bold'}>
          DUBR: {formatDubr(dubrValue)}
        </span>
      </div>
    </div>
  );
}

export function OnDeckStagingPool({
  onDeckGroups,
  onDispatchToCourt,
  onOpenCustomBuilder,
}: OnDeckStagingPoolProps): React.JSX.Element {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-600" />
          <h3 className="text-xs font-headline-sm font-extrabold uppercase tracking-tight text-slate-900 flex items-center gap-1.5">
            <span>On-Deck Staging Pool</span>
          </h3>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-600 text-white font-bold">
            3 BAYS FORMED
          </span>
        </div>
        <span className="text-[10px] font-mono text-on-surface-variant uppercase font-medium">
          Rotations • Fair Δ
        </span>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {SLOT_DEFINITIONS.map((def) => {
          const group = onDeckGroups.find((g) => g.slotIndex === def.slotIndex);

          if (!group) {
            if (def.slotIndex === 3) {
              return (
                <div
                  key={`slot-${def.slotIndex}`}
                  className="silk-sunken-shallow p-2.5 rounded-xl border-l-4 border-l-amber-500 border-t border-r border-b border-outline-variant flex flex-col justify-between bg-amber-50/20"
                >
                  <div className="flex items-center justify-between border-b border-outline-variant pb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-800">
                      #3 · Custom Staging (Organizer Slot)
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono-badge ${def.badgeStyle}`}
                    >
                      {def.label}
                    </span>
                  </div>
                  <div className="py-2 text-center space-y-0.5">
                    <div className="text-xs font-headline-sm font-bold text-slate-900">Custom Match Staging</div>
                    <p className="text-[10px] text-on-surface-variant max-w-[200px] mx-auto font-body-base">
                      Assemble hand-picked doubles pairs for the next free court.
                    </p>
                  </div>
                  <div className="pt-1.5 border-t border-outline-variant">
                    <button
                      type="button"
                      onClick={() => onOpenCustomBuilder?.(3)}
                      className="silk-btn-primary w-full h-7 px-3 rounded-lg text-white font-headline-sm font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-xs"
                    >
                      <span>+ Assemble Custom Match</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`slot-${def.slotIndex}`}
                className="silk-sunken-shallow p-2.5 rounded-xl border-l-4 border-l-slate-300 border-t border-r border-b border-outline-variant border-dashed flex flex-col justify-between bg-slate-50/50"
              >
                <div className="flex items-center justify-between border-b border-outline-variant pb-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-600">
                    Slot {def.slotIndex}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono-badge ${def.badgeStyle}`}
                  >
                    {def.label}
                  </span>
                </div>
                <div className="py-2.5 text-center flex items-center justify-center gap-2">
                  <span className="text-slate-400 font-mono text-sm">⏳</span>
                  <span className="text-xs font-headline-sm font-bold text-slate-600">Awaiting Queue Backfill</span>
                  <span className="text-[10px] text-slate-400 font-body-base">
                    (Needs 4 waiting players to form match)
                  </span>
                </div>
              </div>
            );
          }

          const [playerA1, playerA2] = group.pairA;
          const [playerB1, playerB2] = group.pairB;
          const borderAccent =
            def.slotIndex === 1
              ? 'border-l-indigo-600 bg-indigo-50/20'
              : def.slotIndex === 2
              ? 'border-l-sky-500 bg-sky-50/20'
              : 'border-l-amber-500 bg-amber-50/20';

          return (
            <div
              key={`slot-${def.slotIndex}`}
              className={`silk-sunken-shallow p-2.5 rounded-xl border-l-4 ${borderAccent} border-t border-r border-b border-outline-variant flex flex-col justify-between shadow-xs transition-all`}
            >
              <div className="flex items-center justify-between border-b border-outline-variant pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono-badge ${def.badgeStyle}`}
                  >
                    {def.slotIndex === 3 ? '#3 · Custom Staging' : group.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 font-semibold">
                    Δ <strong className="text-slate-800">{group.spread} RS</strong>
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-outline-variant font-medium">
                  {group.policy}
                </span>
              </div>

              <div className="my-1.5 space-y-1.5">
                {/* Team A */}
                <div className="p-1.5 rounded-lg bg-white border border-outline-variant shadow-2xs">
                  <div className="flex items-center justify-between text-[9px] uppercase font-mono font-bold text-indigo-700 mb-0.5">
                    <span>Pair A</span>
                    <span>Avg: {group.pairARating}</span>
                  </div>
                  {renderPlayerRow(playerA1, 'emerald')}
                  {renderPlayerRow(playerA2, 'emerald')}
                </div>

                {/* Team B */}
                <div className="p-1.5 rounded-lg bg-white border border-outline-variant shadow-2xs">
                  <div className="flex items-center justify-between text-[9px] uppercase font-mono font-bold text-amber-700 mb-0.5">
                    <span>Pair B</span>
                    <span>Avg: {group.pairBRating}</span>
                  </div>
                  {renderPlayerRow(playerB1, 'amber')}
                  {renderPlayerRow(playerB2, 'amber')}
                </div>
              </div>

              <div className="pt-1.5 border-t border-outline-variant">
                {def.slotIndex === 3 ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-1">
                      {[1, 2, 3].map((cId) => (
                        <button
                          key={cId}
                          type="button"
                          onClick={() => onDispatchToCourt?.(3, cId)}
                          className="min-h-[26px] h-6 px-1 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-mono font-bold text-[10px] flex items-center justify-center gap-0.5 cursor-pointer active:scale-95 transition-all"
                        >
                          <span>⚡ Send C{cId}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCustomBuilder?.(3)}
                      className="silk-extruded-sm w-full h-6 px-2 rounded-md border border-outline-variant text-slate-800 text-[10px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 active:scale-95 transition-all"
                    >
                      <span>Edit Pairs</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDispatchToCourt?.(group.slotIndex)}
                    className="silk-btn-primary w-full h-7 px-3 rounded-lg text-white font-headline-sm font-bold text-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-xs"
                  >
                    <span>⚡ Dispatch to Court</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
