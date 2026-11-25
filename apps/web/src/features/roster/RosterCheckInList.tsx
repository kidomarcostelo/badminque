'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  formatDubr,
  isProvisional,
  ratingToDubr,
  type PlayerState,
  type RosterPlayer,
  type SkillTier,
} from '@badminque/core';
import { PlayerStatusBadge } from './PlayerStatusBadge';
import { ProvisionalBadge } from './ProvisionalBadge';
import { RosterCheckInModal } from './RosterCheckInModal';
import { TierAnchorSelector } from './TierAnchorSelector';
import { useRoster } from './useRoster';

export interface RosterCheckInListProps {
  clubId?: string;
  onRosterChange?: () => void;
  onSelectPlayer?: (player: RosterPlayer) => void;
  roster?: RosterPlayer[];
  onSeedDemo?: () => void | Promise<void>;
  onCheckIn?: (
    name: string,
    tier?: SkillTier,
    clubId?: string
  ) => Promise<RosterPlayer>;
  onUpdatePlayerStatus?: (playerId: string, status: PlayerState) => Promise<void>;
}

function getPlayerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) {
    return 'P';
  }
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  const first = parts[0][0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

function getNextToggleStatus(currentStatus: PlayerState): PlayerState {
  if (currentStatus === 'QUEUED') {
    return 'RESTING';
  }
  return 'QUEUED';
}

export function RosterCheckInList({
  clubId,
  onRosterChange,
  onSelectPlayer,
  roster: propRoster,
  onSeedDemo,
  onCheckIn,
  onUpdatePlayerStatus,
}: RosterCheckInListProps): React.JSX.Element {
  const {
    roster,
    suggestions,
    searchQuery,
    setSearchQuery,
    checkInPlayer,
    updatePlayerStatus,
    refreshRoster,
  } = useRoster(clubId, { skipRemoteHydration: Boolean(propRoster) });

  const effectiveCheckIn = onCheckIn ?? checkInPlayer;
  const effectiveUpdateStatus = onUpdatePlayerStatus ?? updatePlayerStatus;

  const [inputName, setInputName] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<SkillTier>('INTERMEDIATE');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (propRoster) {
      void refreshRoster();
    }
  }, [propRoster, refreshRoster]);

  const effectiveRoster = propRoster ?? roster;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const effectiveFilteredRoster = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return effectiveRoster;
    }
    return effectiveRoster.filter((player) =>
      player.name.toLowerCase().includes(normalizedQuery)
    );
  }, [effectiveRoster, normalizedQuery]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setInputName(value);
    setSearchQuery(value);
  };

  const handleCheckInSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = inputName.trim();
    if (trimmed.length === 0) {
      return;
    }

    // Check if player with exact name already exists to prevent duplicate profiles
    const existing = effectiveRoster.find(
      (player) => player.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      if (existing.status !== 'QUEUED') {
        await effectiveUpdateStatus(existing.id, 'QUEUED');
        onRosterChange?.();
      }
      setInputName('');
      setSearchQuery('');
      return;
    }

    await effectiveCheckIn(trimmed, selectedTier, clubId);
    onRosterChange?.();
    setInputName('');
    setSearchQuery('');
  };

  const handleSelectSuggestion = async (player: RosterPlayer): Promise<void> => {
    if (player.status !== 'QUEUED') {
      await effectiveUpdateStatus(player.id, 'QUEUED');
      onRosterChange?.();
    }
    setInputName('');
    setSearchQuery('');
  };

  const handleToggleStatus = async (player: RosterPlayer): Promise<void> => {
    const nextStatus = getNextToggleStatus(player.status);
    await effectiveUpdateStatus(player.id, nextStatus);
    onRosterChange?.();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Fast 1-Tap Check-In */}
      <div className="relative space-y-2">
        <form onSubmit={handleCheckInSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">
              search
            </span>
            <input
              type="text"
              value={inputName}
              onChange={handleInputChange}
              placeholder="Search roster or enter name to check in..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={inputName.trim().length === 0}
            className="h-8 silk-btn-primary px-3 text-white font-headline-sm font-bold text-xs rounded-lg transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-95"
          >
            <span>+</span>
            <span>Add Player</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="Open detailed check-in modal"
            className="h-8 px-2.5 silk-extruded-sm hover:bg-slate-100 text-slate-800 font-headline-sm font-semibold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap border border-outline-variant shadow-2xs active:scale-95"
          >
            <span>+ Modal</span>
          </button>
        </form>

        {/* 1-Tap Tier Anchor Pills */}
        <div className="pt-0.5">
          <TierAnchorSelector
            selectedTier={selectedTier}
            onSelectTier={setSelectedTier}
          />
        </div>

        {/* Typeahead Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-10 mt-1 bg-white border border-outline-variant rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-500 bg-slate-50 border-b border-outline-variant uppercase">
              Existing Roster Suggestions (Click to select)
            </div>
            {suggestions.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => handleSelectSuggestion(player)}
                aria-label={`Select existing player ${player.name}`}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors border-b border-outline-variant/60 last:border-b-0 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-700">
                    {getPlayerInitials(player.name)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-body-base font-bold text-slate-900">
                      {player.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      DUBR: {formatDubr(player.doubles_dubr ?? ratingToDubr(player.doubles_rating))}
                    </span>
                    {isProvisional(player.matches_played) && <ProvisionalBadge />}
                  </div>
                </div>
                <PlayerStatusBadge status={player.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Bench Roster Table */}
      <div className="silk-extruded rounded-xl border border-outline-variant overflow-hidden shadow-xs">
        <div className="px-3.5 py-2 border-b border-outline-variant flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[16px]">
              table_chart
            </span>
            <h3 className="font-headline-sm font-extrabold text-slate-900 text-xs uppercase tracking-tight">
              Active Bench Roster
            </h3>
            <span className="px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold bg-indigo-600 text-white">
              {effectiveRoster.length}
            </span>
          </div>
          {searchQuery.trim().length > 0 && (
            <span className="text-[10px] font-mono text-slate-500">
              Filtered: {effectiveFilteredRoster.length} of {effectiveRoster.length}
            </span>
          )}
        </div>

        {effectiveFilteredRoster.length === 0 ? (
          <div className="p-8 text-center text-xs font-body-base text-on-surface-variant flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-[26px]">
              group_add
            </span>
            <span>No players checked in yet. Type a name above to check in.</span>
            {onSeedDemo && (
              <button
                type="button"
                onClick={() => void onSeedDemo()}
                className="mt-1 h-7 px-3 rounded-lg silk-btn-primary text-white font-headline-sm font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                <span>Populate Demo Roster</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-mono text-[9px] uppercase border-b border-outline-variant">
                <tr>
                  <th scope="col" className="py-1.5 px-3 font-bold">
                    Player Name &amp; ID
                  </th>
                  <th scope="col" className="py-1.5 px-2 font-bold">
                    DUBR (Rating)
                  </th>
                  <th scope="col" className="py-1.5 px-2 text-center font-bold">
                    Matches
                  </th>
                  <th scope="col" className="py-1.5 px-2 font-bold">
                    Status
                  </th>
                  <th scope="col" className="py-1.5 px-3 text-right font-bold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                {effectiveFilteredRoster.map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                          {getPlayerInitials(player.name)}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => onSelectPlayer?.(player)}
                            className="font-body-base font-bold text-slate-900 text-[11px] hover:text-primary transition-colors text-left block"
                          >
                            {player.name}
                          </button>
                          {player.locked_partner_name && (
                            <div className="text-[9px] text-amber-700 font-mono flex items-center gap-1">
                              <span>🔒</span>
                              <span>Pinned to {player.locked_partner_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-primary font-mono text-[11px]">
                          {formatDubr(player.doubles_dubr ?? ratingToDubr(player.doubles_rating))}
                        </span>
                        <span className="text-slate-400 font-mono text-[9px]">
                          {player.doubles_rating.toFixed(0)}
                        </span>
                        {isProvisional(player.matches_played) && <ProvisionalBadge />}
                      </div>
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap text-center font-bold text-slate-800">
                      {player.matches_played}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <PlayerStatusBadge status={player.status} />
                    </td>
                    <td className="py-1.5 px-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onSelectPlayer && (
                          <button
                            type="button"
                            onClick={() => onSelectPlayer(player)}
                            aria-label={`Open action sheet for ${player.name}`}
                            className="silk-extruded-sm h-6 px-2 text-[10px] rounded border border-outline-variant text-slate-700 hover:text-primary font-mono font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            Manage
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(player)}
                          aria-label={`Toggle status for ${player.name}`}
                          className={`h-6 px-2 rounded text-[10px] font-mono font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                            player.status === 'QUEUED'
                              ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                              : 'bg-emerald-500 text-white hover:bg-emerald-600'
                          }`}
                        >
                          {player.status === 'QUEUED' ? 'Rest' : 'Queue'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RosterCheckInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCheckIn={async (name: string, tier: SkillTier) => {
          await checkInPlayer(name, tier, clubId);
          onRosterChange?.();
        }}
      />
    </div>
  );
}
