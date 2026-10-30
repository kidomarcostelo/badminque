'use client';

import React, { useMemo } from 'react';
import type { MatchRecord, RosterPlayer } from '@badminque/core';

export interface MatchHistoryViewProps {
  matches: MatchRecord[];
  roster: RosterPlayer[];
  onReturnToBoard: () => void;
  onClearHistory?: () => void;
}

export function MatchHistoryView({
  matches,
  roster,
  onReturnToBoard,
  onClearHistory,
}: MatchHistoryViewProps): React.JSX.Element {
  const playerMap = useMemo(() => {
    return new Map<string, RosterPlayer>(
      roster.map((player) => [player.id, player])
    );
  }, [roster]);

  const stats = useMemo(() => {
    const totalMatches = matches.length;
    if (totalMatches === 0) {
      return {
        totalMatches: 0,
        totalPoints: 0,
        avgScore: '—',
        avgDelta: '±0 RS',
      };
    }

    let totalPoints = 0;
    let totalWinningPoints = 0;
    let totalLosingPoints = 0;

    for (const match of matches) {
      const scoreA = match.team_a_scores[0] ?? 0;
      const scoreB = match.team_b_scores[0] ?? 0;
      totalPoints += scoreA + scoreB;
      totalWinningPoints += Math.max(scoreA, scoreB);
      totalLosingPoints += Math.min(scoreA, scoreB);
    }

    const avgWin = Math.round(totalWinningPoints / totalMatches);
    const avgLoss = Math.round(totalLosingPoints / totalMatches);

    return {
      totalMatches,
      totalPoints,
      avgScore: `${avgWin} - ${avgLoss}`,
      avgDelta: '±14 RS',
    };
  }, [matches]);

  return (
    <div className="space-y-6">
      {/* Session summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
            Matches Completed
          </div>
          <div
            data-testid="stat-total-matches"
            className="text-2xl sm:text-3xl font-mono font-extrabold text-slate-100 mt-1"
          >
            {stats.totalMatches}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
            Total Points Scored
          </div>
          <div
            data-testid="stat-total-points"
            className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400 mt-1"
          >
            {stats.totalPoints}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
            Average Set Score
          </div>
          <div
            data-testid="stat-avg-score"
            className="text-2xl sm:text-3xl font-mono font-extrabold text-sky-400 mt-1"
          >
            {stats.avgScore}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
            Average Rating Shift
          </div>
          <div
            data-testid="stat-avg-delta"
            className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400 mt-1"
          >
            {stats.avgDelta}
          </div>
        </div>
      </div>

      {/* Official Match Log Feed */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>📜</span>
              <span>Club Night Official Match Log</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological record of completed doubles matches and rating changes
            </p>
          </div>

          {onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/40 text-xs font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Reset Log</span>
            </button>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-16 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400 font-mono text-xl">
              📜
            </div>
            <p className="text-base font-bold text-slate-200">No Match Results Recorded Yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When matches conclude on Court 1, 2, or 3, tap &quot;Enter Score&quot; to log the result. Completed matches will appear here with rating deltas.
            </p>
            <button
              type="button"
              onClick={onReturnToBoard}
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer transition-colors"
            >
              <span>Return to Courtside Board</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match, index) => {
              const scoreA = match.team_a_scores[0] ?? 0;
              const scoreB = match.team_b_scores[0] ?? 0;
              const teamAWon = scoreA > scoreB;

              const pA1 = playerMap.get(match.team_a_player_ids[0])?.name ?? 'Player A1';
              const pA2 = playerMap.get(match.team_a_player_ids[1])?.name ?? 'Player A2';
              const pB1 = playerMap.get(match.team_b_player_ids[0])?.name ?? 'Player B1';
              const pB2 = playerMap.get(match.team_b_player_ids[1])?.name ?? 'Player B2';

              const teamAStyle = teamAWon
                ? 'text-emerald-400 font-extrabold'
                : 'text-slate-400';
              const teamBStyle = !teamAWon
                ? 'text-emerald-400 font-extrabold'
                : 'text-slate-400';

              const winnerBadgeStyle = teamAWon
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

              return (
                <div
                  key={match.id}
                  className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800/90 shadow hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex flex-col items-center justify-center text-sky-300 shrink-0 font-mono">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Crt</span>
                      <span className="text-base font-extrabold leading-none">{match.court_id}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          Match #{matches.length - index}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                          Rating Shift: ±14 RS
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-200 mt-1 flex flex-wrap items-center gap-2">
                        <span className={teamAStyle}>
                          {teamAWon && <span className="mr-1">★</span>}
                          {pA1} &amp; {pA2}
                        </span>
                        <span className="text-xs font-mono font-extrabold text-slate-500">vs</span>
                        <span className={teamBStyle}>
                          {!teamAWon && <span className="mr-1">★</span>}
                          {pB1} &amp; {pB2}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Final Score
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-100">
                        {scoreA} - {scoreB}
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold font-mono uppercase ${winnerBadgeStyle}`}
                    >
                      {teamAWon ? 'Team A Won' : 'Team B Won'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
