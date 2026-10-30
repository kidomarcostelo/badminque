'use client';

import React, { useMemo, useState } from 'react';
import { calculateDoublesMatchDeltas } from '@badminque/core';
import { getPairAverage, type CourtStationData } from './types';

export interface QuickScoreModalProps {
  isOpen: boolean;
  court: CourtStationData;
  onClose: () => void;
  onSubmitScore: (
    courtId: number,
    winner: 'A' | 'B',
    winningScore: number,
    losingScore: number
  ) => Promise<void> | void;
}

const SCORE_PRESETS: { winningScore: number; losingScore: number; label: string; accent: string }[] = [
  { winningScore: 30, losingScore: 28, label: 'Close', accent: 'text-amber-400' },
  { winningScore: 30, losingScore: 25, label: 'Standard', accent: 'text-emerald-400' },
  { winningScore: 30, losingScore: 20, label: 'Solid', accent: 'text-slate-400' },
  { winningScore: 30, losingScore: 15, label: 'Wide', accent: 'text-slate-400' },
  { winningScore: 30, losingScore: 8, label: 'Rout', accent: 'text-slate-400' },
];

const DEUCE_PRESETS: [number, number][] = [
  [31, 29],
  [32, 30],
  [33, 31],
  [34, 32],
];

export function QuickScoreModal({
  isOpen,
  court,
  onClose,
  onSubmitScore,
}: QuickScoreModalProps): React.JSX.Element | null {
  const [selectedWinner, setSelectedWinner] = useState<'A' | 'B'>('A');
  const [winnerScore, setWinnerScore] = useState<number>(30);
  const [loserScore, setLoserScore] = useState<number>(25);
  const [loserDigitBuffer, setLoserDigitBuffer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const teamA = court.teamA;
  const teamB = court.teamB;

  const ratingImpact = useMemo(() => {
    if (!teamA || !teamB) {
      return { deltaA: 14, deltaB: 14, projectedWinnerDelta: 14 };
    }
    const scoreA = selectedWinner === 'A' ? winnerScore : loserScore;
    const scoreB = selectedWinner === 'B' ? winnerScore : loserScore;

    if (scoreA === scoreB) {
      return { deltaA: 0, deltaB: 0, projectedWinnerDelta: 0 };
    }

    try {
      const deltas = calculateDoublesMatchDeltas(
        teamA.map((player) => ({
          id: player.id,
          name: player.name,
          rating: player.doubles_rating,
          matches_played: player.matches_played,
        })),
        teamB.map((player) => ({
          id: player.id,
          name: player.name,
          rating: player.doubles_rating,
          matches_played: player.matches_played,
        })),
        [[scoreA, scoreB]],
        'SINGLE_30'
      );
      const firstPairDelta = deltas[0];
      const secondPairDelta = deltas[1];
      const thirdPairDelta = deltas[2];
      const fourthPairDelta = deltas[3];

      const averageDeltaTeamA =
        firstPairDelta && secondPairDelta
          ? Math.round((firstPairDelta.rating_delta + secondPairDelta.rating_delta) / 2)
          : 14;
      const averageDeltaTeamB =
        thirdPairDelta && fourthPairDelta
          ? Math.round((thirdPairDelta.rating_delta + fourthPairDelta.rating_delta) / 2)
          : 14;

      const winningTeamDelta =
        selectedWinner === 'A' ? Math.abs(averageDeltaTeamA) : Math.abs(averageDeltaTeamB);

      return {
        deltaA: averageDeltaTeamA,
        deltaB: averageDeltaTeamB,
        projectedWinnerDelta: Math.max(1, winningTeamDelta),
      };
    } catch {
      return { deltaA: 14, deltaB: 14, projectedWinnerDelta: 14 };
    }
  }, [teamA, teamB, selectedWinner, winnerScore, loserScore]);

  if (!isOpen || !teamA || !teamB) {
    return null;
  }

  const [playerA1, playerA2] = teamA;
  const [playerB1, playerB2] = teamB;
  const avgA = getPairAverage(teamA);
  const avgB = getPairAverage(teamB);

  const displayScoreA = selectedWinner === 'A' ? winnerScore : loserScore;
  const displayScoreB = selectedWinner === 'B' ? winnerScore : loserScore;

  const handleApplyPreset = (winningPoints: number, losingPoints: number): void => {
    setWinnerScore(winningPoints);
    setLoserScore(losingPoints);
    setLoserDigitBuffer('');
  };

  const handleStepWinnerScore = (delta: number): void => {
    setLoserDigitBuffer('');
    const minScore = Math.max(30, loserScore >= 29 ? loserScore + 2 : 30);
    const newWinnerScore = Math.max(minScore, Math.min(40, winnerScore + delta));
    setWinnerScore(newWinnerScore);
    if (loserScore >= newWinnerScore) {
      setLoserScore(Math.max(0, newWinnerScore - 2));
    }
  };

  const handleStepLoserScore = (delta: number): void => {
    setLoserDigitBuffer('');
    const newLoserScore = Math.max(0, Math.min(38, loserScore + delta));
    setLoserScore(newLoserScore);
    if (newLoserScore >= 29) {
      setWinnerScore(Math.min(40, newLoserScore + 2));
    } else if (winnerScore < 30) {
      setWinnerScore(30);
    }
  };

  const handleTapLoserDigit = (digit: number): void => {
    let nextBuffer = loserDigitBuffer + String(digit);
    if (nextBuffer.length > 2) {
      nextBuffer = String(digit);
    }
    let parsed = parseInt(nextBuffer, 10);
    if (Number.isNaN(parsed)) {
      parsed = 0;
    }
    if (parsed > 38) {
      parsed = digit;
      nextBuffer = String(digit);
    }
    setLoserDigitBuffer(nextBuffer);
    setLoserScore(parsed);
    if (parsed >= 29) {
      setWinnerScore(parsed + 2);
    } else {
      setWinnerScore(30);
    }
  };

  const handleClearLoserDigits = (): void => {
    setLoserDigitBuffer('');
    setWinnerScore(30);
    setLoserScore(25);
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (isSubmitting || winnerScore <= loserScore) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmitScore(court.courtId, selectedWinner, winnerScore, loserScore);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWinnerA = selectedWinner === 'A';
  const isWinnerB = selectedWinner === 'B';

  const pairAButtonClass = isWinnerA
    ? 'p-4 rounded-xl border-2 border-emerald-500 bg-emerald-950/30 text-left transition flex items-center justify-between gap-3 cursor-pointer'
    : 'p-4 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-left transition flex items-center justify-between gap-3 opacity-85 cursor-pointer';

  const pairBButtonClass = isWinnerB
    ? 'p-4 rounded-xl border-2 border-emerald-500 bg-emerald-950/30 text-left transition flex items-center justify-between gap-3 cursor-pointer'
    : 'p-4 rounded-xl border-2 border-slate-800 bg-slate-950/60 text-left transition flex items-center justify-between gap-3 opacity-85 cursor-pointer';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-score-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono font-extrabold text-sm">
              COURT {court.courtId}
            </span>
            <div>
              <h3 id="quick-score-title" className="text-lg font-extrabold text-slate-100 leading-tight">
                30-Point Match Score Entry
              </h3>
              <p className="text-xs text-slate-400">
                Select Winning Pair &amp; tap a 30-pt preset or adjust deuce score
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[85vh] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span>1. Tap Winning Doubles Pair</span>
              <span className="font-mono text-emerald-400">
                Projected Rating Impact: ±{ratingImpact.projectedWinnerDelta} RS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedWinner('A')}
                className={pairAButtonClass}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        isWinnerA ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isWinnerA ? '★ WINNER • PAIR A' : 'PAIR A'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Avg {avgA}</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-100 truncate mt-1">
                    {playerA1.name} &amp; {playerA2.name}
                  </div>
                  <div
                    className={`text-xs font-mono font-bold mt-0.5 ${
                      isWinnerA ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {ratingImpact.deltaA >= 0
                      ? `+${ratingImpact.deltaA} RS each`
                      : `${ratingImpact.deltaA} RS each`}
                  </div>
                </div>
                <div className="text-4xl font-mono font-extrabold px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                  {displayScoreA}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedWinner('B')}
                className={pairBButtonClass}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        isWinnerB ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isWinnerB ? '★ WINNER • PAIR B' : 'PAIR B'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Avg {avgB}</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-100 truncate mt-1">
                    {playerB1.name} &amp; {playerB2.name}
                  </div>
                  <div
                    className={`text-xs font-mono font-bold mt-0.5 ${
                      isWinnerB ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {ratingImpact.deltaB >= 0
                      ? `+${ratingImpact.deltaB} RS each`
                      : `${ratingImpact.deltaB} RS each`}
                  </div>
                </div>
                <div className="text-4xl font-mono font-extrabold px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                  {displayScoreB}
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              2. Instant 1-Tap 30-Point Presets
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
              {SCORE_PRESETS.map((preset) => {
                const labelText = `${preset.winningScore}-${preset.losingScore}`;
                return (
                  <button
                    key={labelText}
                    type="button"
                    onClick={() => handleApplyPreset(preset.winningScore, preset.losingScore)}
                    className="min-h-[54px] sm:min-h-[60px] rounded-xl bg-slate-800 hover:bg-emerald-500/20 border-2 border-slate-700 flex flex-col items-center justify-center cursor-pointer transition-colors"
                  >
                    <span className="font-mono text-xs sm:text-base font-extrabold text-slate-100">
                      {labelText}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-semibold uppercase ${preset.accent}`}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>🔥</span>
                <span>Overtime Deuce Stepper &amp; Exact Score Adjuster</span>
              </span>
              <div className="flex items-center gap-1.5">
                {DEUCE_PRESETS.map(([wPts, lPts]) => {
                  const deuceLabel = `${wPts}-${lPts}`;
                  return (
                    <button
                      key={deuceLabel}
                      type="button"
                      onClick={() => handleApplyPreset(wPts, lPts)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold cursor-pointer transition-colors"
                    >
                      {deuceLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <div>
                  <div className="text-[11px] font-bold uppercase text-emerald-400">Winning Score</div>
                  <div className="text-xs text-slate-400">Deuce / Cap</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrement Winner Score"
                    onClick={() => handleStepWinnerScore(-1)}
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xl font-mono font-bold text-slate-200 cursor-pointer flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span
                    data-testid="stepper-winner-val"
                    className="w-10 text-center font-mono text-xl font-extrabold text-emerald-400"
                  >
                    {winnerScore}
                  </span>
                  <button
                    type="button"
                    aria-label="Increment Winner Score"
                    onClick={() => handleStepWinnerScore(1)}
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xl font-mono font-bold text-slate-200 cursor-pointer flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-300">Runner-Up Score</div>
                  <div className="text-xs text-slate-400">Points Scored</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrement Runner-Up Score"
                    onClick={() => handleStepLoserScore(-1)}
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xl font-mono font-bold text-slate-200 cursor-pointer flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span
                    data-testid="stepper-loser-val"
                    className="w-10 text-center font-mono text-xl font-extrabold text-slate-100"
                  >
                    {loserScore}
                  </span>
                  <button
                    type="button"
                    aria-label="Increment Runner-Up Score"
                    onClick={() => handleStepLoserScore(1)}
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xl font-mono font-bold text-slate-200 cursor-pointer flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                <span>Direct Runner-Up Keypad (Tap digits to type exact losing score):</span>
                <button
                  type="button"
                  onClick={handleClearLoserDigits}
                  className="text-amber-400 hover:underline font-mono cursor-pointer"
                >
                  Reset (25)
                </button>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    aria-label={`digit-${digit}`}
                    onClick={() => handleTapLoserDigit(digit)}
                    className="min-h-[42px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 font-mono font-bold text-sm text-slate-200 cursor-pointer transition-colors"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[52px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || winnerScore <= loserScore}
              className="flex-1 w-full min-h-[52px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-colors"
            >
              <span>Record Match Score &amp; Rotate Court</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
