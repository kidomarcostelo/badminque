'use client';

import React, { useState } from 'react';
import {
  formatDubr,
  ratingToDubr,
  type RosterPlayer,
} from '@badminque/core';

export interface ClubLeaderboardViewProps {
  roster: RosterPlayer[];
  onSelectPlayer?: (player: RosterPlayer) => void;
}

export function ClubLeaderboardView({
  roster,
  onSelectPlayer,
}: ClubLeaderboardViewProps): React.JSX.Element {
  const [discipline, setDiscipline] = useState<'DOUBLES' | 'SINGLES'>('DOUBLES');
  const [includeProvisional, setIncludeProvisional] = useState<boolean>(false);

  const isDoubles = discipline === 'DOUBLES';

  // 1. Filter provisional if not toggled
  const filtered = roster.filter((player) => {
    const matches = isDoubles
      ? (player.doubles_matches_played ?? player.matches_played ?? 0)
      : (player.singles_matches_played ?? 0);
    if (!includeProvisional && matches < 8) {
      return false;
    }
    return true;
  });

  // 2. Sort descending by discipline rating
  const sorted = [...filtered].sort((a, b) => {
    const ratingA = isDoubles ? a.doubles_rating : a.singles_rating;
    const ratingB = isDoubles ? b.doubles_rating : b.singles_rating;
    return ratingB - ratingA;
  });

  // 3. Compute window ranks
  let currentRank = 1;
  const rankedPlayers = sorted.map((player, idx) => {
    const rating = isDoubles ? player.doubles_rating : player.singles_rating;
    if (idx > 0) {
      const prev = sorted[idx - 1];
      const prevRating = prev ? (isDoubles ? prev.doubles_rating : prev.singles_rating) : 0;
      if (rating < prevRating) {
        currentRank = idx + 1;
      }
    }
    return {
      player,
      rank: currentRank,
      rating,
      dubr: formatDubr(
        isDoubles
          ? player.doubles_dubr ?? ratingToDubr(rating)
          : player.singles_dubr ?? ratingToDubr(rating)
      ),
      matches: isDoubles
        ? (player.doubles_matches_played ?? player.matches_played ?? 0)
        : (player.singles_matches_played ?? 0),
      isProvisional:
        (isDoubles
          ? (player.doubles_matches_played ?? player.matches_played ?? 0)
          : (player.singles_matches_played ?? 0)) < 8,
    };
  });

  const getRankBadge = (rank: number): React.JSX.Element => {
    if (rank === 1) return <span className="text-amber-400 font-extrabold text-base">🥇 #1</span>;
    if (rank === 2) return <span className="text-slate-300 font-extrabold text-base">🥈 #2</span>;
    if (rank === 3) return <span className="text-amber-600 font-extrabold text-base">🥉 #3</span>;
    return <span className="text-slate-400 font-mono font-bold text-sm">#{rank}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Controls & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            Universal Skill Rankings
          </span>
          <h2 className="text-xl font-extrabold text-slate-100">Official Club Leaderboard</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Discipline Toggle */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setDiscipline('DOUBLES')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                isDoubles ? 'bg-emerald-500 text-slate-950 font-extrabold shadow' : 'text-slate-400'
              }`}
            >
              Doubles ($R_D$)
            </button>
            <button
              type="button"
              onClick={() => setDiscipline('SINGLES')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                !isDoubles ? 'bg-emerald-500 text-slate-950 font-extrabold shadow' : 'text-slate-400'
              }`}
            >
              Singles ($R_S$)
            </button>
          </div>

          {/* Include Provisional Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <input
              type="checkbox"
              checked={includeProvisional}
              onChange={(e) => setIncludeProvisional(e.target.checked)}
              aria-label="Include Provisional Players"
              className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
            />
            <span>Include Provisional (&lt;8 matches)</span>
          </label>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      {rankedPlayers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          No established players yet in this discipline. Toggle &quot;Include Provisional&quot; to see players still completing their 8-match graduation requirement.
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4 text-right">DUBR</th>
                  <th className="py-3 px-4 text-right">Elo Rating</th>
                  <th className="py-3 px-4 text-right">Matches</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {rankedPlayers.map(({ player, rank, rating, dubr, matches, isProvisional }) => (
                  <tr
                    key={player.id}
                    onClick={() => onSelectPlayer?.(player)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 w-16">{getRankBadge(rank)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                          {player.name}
                        </span>
                        {player.auth_user_id && (
                          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                            Claimed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-400">
                      {dubr}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200">
                      {rating}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {matches}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isProvisional
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {isProvisional ? 'Provisional' : 'Established'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
