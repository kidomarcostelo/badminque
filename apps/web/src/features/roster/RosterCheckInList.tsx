'use client';

import React, { useState } from 'react';
import {
  formatDubr,
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
}: RosterCheckInListProps): React.JSX.Element {
  const {
    roster,
    filteredRoster,
    suggestions,
    searchQuery,
    setSearchQuery,
    checkInPlayer,
    updatePlayerStatus,
  } = useRoster(clubId);

  const [inputName, setInputName] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<SkillTier>('INTERMEDIATE');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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
    const existing = roster.find(
      (player) => player.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      if (existing.status !== 'QUEUED') {
        await updatePlayerStatus(existing.id, 'QUEUED');
        onRosterChange?.();
      }
      setInputName('');
      setSearchQuery('');
      return;
    }

    await checkInPlayer(trimmed, selectedTier, clubId);
    onRosterChange?.();
    setInputName('');
    setSearchQuery('');
  };

  const handleSelectSuggestion = async (player: RosterPlayer): Promise<void> => {
    if (player.status !== 'QUEUED') {
      await updatePlayerStatus(player.id, 'QUEUED');
      onRosterChange?.();
    }
    setInputName('');
    setSearchQuery('');
  };

  const handleToggleStatus = async (player: RosterPlayer): Promise<void> => {
    const nextStatus = getNextToggleStatus(player.status);
    await updatePlayerStatus(player.id, nextStatus);
    onRosterChange?.();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Search & Fast 1-Tap Check-In */}
      <div className="relative space-y-2.5">
        <form onSubmit={handleCheckInSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputName}
            onChange={handleInputChange}
            placeholder="Search roster or enter name to check in..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={inputName.trim().length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed shadow-md shadow-emerald-600/10"
          >
            Add Player
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="Open detailed check-in modal"
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap border border-slate-700"
          >
            + Modal
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
          <div className="absolute z-20 left-0 right-0 top-12 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
            <div className="px-3 py-1.5 text-xs text-slate-400 bg-slate-950/60 border-b border-slate-800">
              Existing Roster Suggestions (Click to select)
            </div>
            {suggestions.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => handleSelectSuggestion(player)}
                aria-label={`Select existing player ${player.name}`}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-800 flex items-center justify-between transition-colors border-b border-slate-800/50 last:border-b-0 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-emerald-400">
                    {getPlayerInitials(player.name)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      {player.name}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      DUBR: {formatDubr(player.doubles_dubr ?? ratingToDubr(player.doubles_rating))}
                    </span>
                    {player.matches_played < 8 && <ProvisionalBadge />}
                  </div>
                </div>
                <PlayerStatusBadge status={player.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Bench Roster Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-200 text-sm md:text-base">
              Active Bench Roster
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-emerald-400 font-medium">
              {roster.length}
            </span>
          </div>
          {searchQuery.trim().length > 0 && (
            <span className="text-xs text-slate-400">
              Filtered: {filteredRoster.length} of {roster.length}
            </span>
          )}
        </div>

        {filteredRoster.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No players checked in yet. Type a name above to check in.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/40 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Player
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    DUBR
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Matches
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRoster.map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {getPlayerInitials(player.name)}
                        </div>
                        <span className="font-medium text-slate-200">
                          {player.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-200 font-mono text-xs font-bold">
                            {formatDubr(player.doubles_dubr ?? ratingToDubr(player.doubles_rating))}
                          </span>
                          {player.matches_played < 8 && <ProvisionalBadge />}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {player.initial_tier === 'INTERMEDIATE' ? '1500' : player.doubles_rating.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-xs">
                      {player.matches_played}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <PlayerStatusBadge status={player.status} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(player)}
                        aria-label={`Toggle status for ${player.name}`}
                        className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      >
                        {player.status === 'QUEUED' ? 'Rest' : 'Queue'}
                      </button>
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
