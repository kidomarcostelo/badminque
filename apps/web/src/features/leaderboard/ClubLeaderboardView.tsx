'use client';

import React, { useState } from 'react';
import {
  formatDubr,
  getEffectiveDisciplineRating,
  ratingToDubr,
  type RosterPlayer,
} from '@badminque/core';
import { ProvisionalBadge } from '../roster/ProvisionalBadge';

export interface ClubLeaderboardViewProps {
  roster: RosterPlayer[];
  onSelectPlayer?: (player: RosterPlayer) => void;
}

export function ClubLeaderboardView({
  roster,
  onSelectPlayer,
}: ClubLeaderboardViewProps): React.JSX.Element {
  const [discipline, setDiscipline] = useState<'DOUBLES' | 'SINGLES'>('DOUBLES');
  const [isCalibratingOpen, setIsCalibratingOpen] = useState<boolean>(false);

  const isDoubles = discipline === 'DOUBLES';

  const getPlayerMatches = (player: RosterPlayer): number => {
    return isDoubles
      ? (player.doubles_matches_played ?? player.matches_played ?? 0)
      : (player.singles_matches_played ?? 0);
  };

  const isPlayerEstablished = (player: RosterPlayer): boolean => {
    return isDoubles
      ? player.doubles_is_provisional === false || getPlayerMatches(player) >= 8
      : player.singles_is_provisional === false || getPlayerMatches(player) >= 8;
  };

  const getPlayerRating = (player: RosterPlayer): number => {
    return getEffectiveDisciplineRating(player, discipline).rating;
  };

  const getPlayerDubr = (player: RosterPlayer): string => {
    const rating = getPlayerRating(player);
    const dubr = isDoubles
      ? (player.doubles_dubr ?? ratingToDubr(rating))
      : (player.singles_dubr ?? ratingToDubr(rating));
    const isSeeded = getEffectiveDisciplineRating(player, discipline).isSeeded;
    if (isSeeded) {
      return formatDubr(ratingToDubr(rating));
    }
    return formatDubr(dubr);
  };

  const formatRating = (val: number): string => {
    return Number.isInteger(val) ? val.toString() : val.toFixed(1);
  };

  // 1. Separate established (>=8 matches or is_provisional === false) from calibrating (<8 matches) players
  const establishedPlayers = roster.filter(isPlayerEstablished);
  const calibratingPlayers = roster.filter((p) => !isPlayerEstablished(p));

  // 2. Sort established descending by discipline rating (tie breaker by name)
  const sortedEstablished = [...establishedPlayers].sort((a, b) => {
    const ratingDiff = getPlayerRating(b) - getPlayerRating(a);
    if (Math.abs(ratingDiff) > 1e-4) return ratingDiff;
    return a.name.localeCompare(b.name);
  });

  // 3. Compute SQL RANK() window ranking over established players
  let currentRank = 1;
  const rankedEstablished = sortedEstablished.map((player, idx) => {
    const rating = getPlayerRating(player);
    if (idx > 0) {
      const prev = sortedEstablished[idx - 1];
      const prevRating = prev ? getPlayerRating(prev) : 0;
      if (prevRating - rating > 1e-4) {
        currentRank = idx + 1;
      }
    }
    return {
      player,
      rank: currentRank,
      rating,
      dubr: getPlayerDubr(player),
      matches: getPlayerMatches(player),
    };
  });

  // 4. Sort calibrating players by matches descending, then rating descending
  const sortedCalibrating = [...calibratingPlayers].sort((a, b) => {
    const matchesDiff = getPlayerMatches(b) - getPlayerMatches(a);
    if (matchesDiff !== 0) return matchesDiff;
    return getPlayerRating(b) - getPlayerRating(a);
  });

  const getRankBadge = (rank: number): React.JSX.Element => {
    if (rank === 1) return <span className="text-amber-400 font-extrabold text-base">🥇 #1</span>;
    if (rank === 2) return <span className="text-slate-300 font-extrabold text-base">🥈 #2</span>;
    if (rank === 3) return <span className="text-amber-600 font-extrabold text-base">🥉 #3</span>;
    return <span className="text-slate-400 font-mono font-bold text-sm">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Controls & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            Universal Skill Rankings
          </span>
          <h2 className="text-xl font-extrabold text-slate-100">Official Club Leaderboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Window-ranked official leaderboard restricted to established players (≥8 matches).
          </p>
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

          {/* Calibrating Section Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={isCalibratingOpen}
              onChange={(e) => setIsCalibratingOpen(e.target.checked)}
              aria-label="Include Provisional Players"
              className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
            />
            <span>Include Provisional (&lt;8 matches)</span>
          </label>
        </div>
      </div>

      {/* Official Leaderboard Table (Established Players) */}
      {roster.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          No players in the club roster. Check in players to see rankings.
        </div>
      ) : rankedEstablished.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          No established players yet in this discipline. Players graduate into official club rankings upon completing 8 matches.
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
                  <th className="py-3 px-4 text-right">Rating</th>
                  <th className="py-3 px-4 text-right">Matches</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {rankedEstablished.map(({ player, rank, rating, dubr, matches }) => (
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
                      {formatRating(rating)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {matches}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/15 border-emerald-500/40 text-emerald-300">
                        Established
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collapsible Calibrating Section (Provisional Players < 8 matches) */}
      <section
        aria-label="Calibrating Roster"
        className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md"
      >
        {/* Collapsible Header Trigger */}
        <div className="p-4 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                Calibrating Players ({calibratingPlayers.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Players completing their 8-match graduation milestone. Unranked until established.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCalibratingOpen(!isCalibratingOpen)}
            aria-expanded={isCalibratingOpen}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            {isCalibratingOpen ? 'Hide Calibrating' : `Show Calibrating (${calibratingPlayers.length})`}
          </button>
        </div>

        {/* Collapsible Content */}
        {isCalibratingOpen && (
          <div className="overflow-x-auto">
            {sortedCalibrating.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                All active players in this discipline are established!
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-mono uppercase text-slate-400">
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4 text-right">DUBR</th>
                    <th className="py-3 px-4 text-right">Rating</th>
                    <th className="py-3 px-4 text-right">Matches</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs">
                  {sortedCalibrating.map((player) => {
                    const matches = getPlayerMatches(player);
                    const rating = getPlayerRating(player);
                    const dubr = getPlayerDubr(player);
                    const isSeeded = getEffectiveDisciplineRating(player, discipline).isSeeded;

                    return (
                      <tr
                        key={player.id}
                        onClick={() => onSelectPlayer?.(player)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 w-40">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-bold text-amber-300">
                              {matches}/8 matches
                            </span>
                            <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (matches / 8) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                              {player.name}
                            </span>
                            {isSeeded && (
                              <span className="text-[10px] bg-purple-500/15 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold">
                                Seeded
                              </span>
                            )}
                            {player.auth_user_id && (
                              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                                Claimed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                          {dubr}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatRating(rating)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {matches}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <ProvisionalBadge />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
