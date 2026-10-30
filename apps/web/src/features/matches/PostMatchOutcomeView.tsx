'use client';

import React from 'react';
import { formatDubr, formatDubrDelta } from '@badminque/core';
import type { MatchRecord, PlayerRatingDelta } from '@badminque/core';

export interface PostMatchOutcomeViewProps {
  match: MatchRecord;
  deltas: PlayerRatingDelta[];
  onDismiss: () => void;
}

interface TeamCardProps {
  title: string;
  isWinner: boolean;
  scoreText: string;
  playerDeltas: PlayerRatingDelta[];
}

function TeamOutcomeCard({
  title,
  isWinner,
  scoreText,
  playerDeltas,
}: TeamCardProps): React.JSX.Element {
  const borderClass = isWinner ? 'border-emerald-500/30' : 'border-slate-800';
  const badgeClass = isWinner
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div
      className={`rounded-xl bg-slate-900/60 border ${borderClass} p-4 flex flex-col gap-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 text-sm">{title}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
          >
            {isWinner ? 'Winner' : 'Runner-Up'}
          </span>
        </div>
        <span className="text-xl font-bold font-mono text-slate-100">
          {scoreText}
        </span>
      </div>

      <div className="divide-y divide-slate-800/60 flex flex-col">
        {playerDeltas.map((player) => {
          const deltaSignClass =
            player.dubr_delta >= 0
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

          return (
            <div
              key={player.player_id}
              className="py-2.5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200 text-sm">
                  {player.player_name || player.player_id.substring(0, 8)}
                </span>
                {player.is_provisional && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Provisional
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="text-slate-400 text-right font-mono">
                  <span className="text-slate-500 text-[10px] block">
                    Before: {formatDubr(player.pre_dubr)}
                  </span>
                  <span className="font-semibold text-slate-200">
                    {formatDubr(player.post_dubr)}
                  </span>
                </div>

                <div
                  className={`px-2 py-1 rounded border font-mono font-bold text-xs ${deltaSignClass}`}
                >
                  {formatDubrDelta(player.dubr_delta)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PostMatchOutcomeView({
  match,
  deltas,
  onDismiss,
}: PostMatchOutcomeViewProps): React.JSX.Element {
  const teamAPlayers = deltas.filter((d) =>
    match.team_a_player_ids.includes(d.player_id)
  );
  const teamBPlayers = deltas.filter((d) =>
    match.team_b_player_ids.includes(d.player_id)
  );

  const setsWonA = match.team_a_scores.filter(
    (sa, i) => sa > (match.team_b_scores[i] ?? 0)
  ).length;
  const setsWonB = match.team_b_scores.filter(
    (sb, i) => sb > (match.team_a_scores[i] ?? 0)
  ).length;
  const teamAWon = setsWonA > setsWonB;

  const isMultiSet = match.team_a_scores.length > 1;
  const scoreSummary = match.team_a_scores
    .map((sa, i) => `${sa} - ${match.team_b_scores[i] ?? 0}`)
    .join(', ');

  const scoreTextA = isMultiSet
    ? `${setsWonA} sets`
    : String(match.team_a_scores[0] ?? 0);
  const scoreTextB = isMultiSet
    ? `${setsWonB} sets`
    : String(match.team_b_scores[0] ?? 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Match Outcome View"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 md:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              Match Complete
            </span>
            <h2 className="text-xl font-bold text-slate-100 mt-0.5">
              Court {match.court_id} Outcome
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Final Score</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {scoreSummary}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <TeamOutcomeCard
            title="Team A"
            isWinner={teamAWon}
            scoreText={scoreTextA}
            playerDeltas={teamAPlayers}
          />
          <TeamOutcomeCard
            title="Team B"
            isWinner={!teamAWon}
            scoreText={scoreTextB}
            playerDeltas={teamBPlayers}
          />
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm"
        >
          Return to Courtside Station
        </button>
      </div>
    </div>
  );
}

