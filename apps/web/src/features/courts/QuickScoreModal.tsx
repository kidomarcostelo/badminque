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
  { winningScore: 30, losingScore: 28, label: 'Close', accent: 'text-amber-700' },
  { winningScore: 30, losingScore: 25, label: 'Standard', accent: 'text-emerald-700' },
  { winningScore: 30, losingScore: 20, label: 'Solid', accent: 'text-slate-600' },
  { winningScore: 30, losingScore: 15, label: 'Wide', accent: 'text-slate-600' },
  { winningScore: 30, losingScore: 8, label: 'Rout', accent: 'text-slate-600' },
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
    ? 'p-3.5 rounded-xl bg-indigo-600 border-2 border-indigo-700 text-left transition flex items-center justify-between gap-2 shadow-sm text-white cursor-pointer active:scale-98'
    : 'p-3.5 rounded-xl silk-sunken-shallow border border-outline-variant text-left transition flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer active:scale-98';

  const pairBButtonClass = isWinnerB
    ? 'p-3.5 rounded-xl bg-indigo-600 border-2 border-indigo-700 text-left transition flex items-center justify-between gap-2 shadow-sm text-white cursor-pointer active:scale-98'
    : 'p-3.5 rounded-xl silk-sunken-shallow border border-outline-variant text-left transition flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer active:scale-98';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-score-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-xs"
    >
      <div className="silk-extruded bg-white border border-outline-variant rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col transition-all">
        {/* Header */}
        <div className="px-5 py-3.5 bg-white border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl silk-btn-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[19px]">scoreboard</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-extrabold uppercase">
                  COURT {court.courtId}
                </span>
                <h3 id="quick-score-title" className="font-headline-sm font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  30-Point Match Score Entry
                </h3>
              </div>
              <p className="text-[11px] text-on-surface-variant font-mono">
                30-Point Standard Badminton Rally Turnover
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-lg silk-extruded-sm hover:bg-slate-100 text-on-surface-variant flex items-center justify-center border border-outline-variant cursor-pointer active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 max-h-[85vh] overflow-y-auto">
          {/* 1. Winner Selection */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-on-surface-variant mb-1.5 uppercase">
              <span>1. Tap Winning Doubles Pair</span>
              <span className="text-primary font-bold">
                Projected Rating Impact: ±{ratingImpact.projectedWinnerDelta} RS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedWinner('A')}
                className={pairAButtonClass}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                        isWinnerA ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isWinnerA ? '★ WINNER • PAIR A' : 'PAIR A'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Avg {avgA}
                    </span>
                  </div>
                  <div className={`text-xs font-bold truncate mt-1 ${isWinnerA ? 'text-white' : 'text-slate-900'}`}>
                    {playerA1.name} &amp; {playerA2.name}
                  </div>
                  <div
                    className={`text-[10px] font-mono font-bold mt-0.5 ${
                      isWinnerA ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    {ratingImpact.deltaA >= 0
                      ? `+${ratingImpact.deltaA} RS each`
                      : `${ratingImpact.deltaA} RS each`}
                  </div>
                </div>
                <div
                  className={`text-3xl font-mono font-extrabold px-3 py-1 rounded-lg border shrink-0 ${
                    isWinnerA
                      ? 'bg-indigo-700/50 border-indigo-400 text-white'
                      : 'bg-white border-outline-variant text-slate-900'
                  }`}
                >
                  {displayScoreA}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedWinner('B')}
                className={pairBButtonClass}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                        isWinnerB ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isWinnerB ? '★ WINNER • PAIR B' : 'PAIR B'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Avg {avgB}
                    </span>
                  </div>
                  <div className={`text-xs font-bold truncate mt-1 ${isWinnerB ? 'text-white' : 'text-slate-900'}`}>
                    {playerB1.name} &amp; {playerB2.name}
                  </div>
                  <div
                    className={`text-[10px] font-mono font-bold mt-0.5 ${
                      isWinnerB ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    {ratingImpact.deltaB >= 0
                      ? `+${ratingImpact.deltaB} RS each`
                      : `${ratingImpact.deltaB} RS each`}
                  </div>
                </div>
                <div
                  className={`text-3xl font-mono font-extrabold px-3 py-1 rounded-lg border shrink-0 ${
                    isWinnerB
                      ? 'bg-indigo-700/50 border-indigo-400 text-white'
                      : 'bg-white border-outline-variant text-slate-900'
                  }`}
                >
                  {displayScoreB}
                </div>
              </button>
            </div>
          </div>

          {/* 2. Instant 1-Tap 30-Point Presets */}
          <div>
            <div className="text-[10px] font-mono text-on-surface-variant uppercase font-bold mb-1.5">
              2. Instant 1-Tap 30-Point Presets
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {SCORE_PRESETS.map((preset) => {
                const labelText = `${preset.winningScore}-${preset.losingScore}`;
                const isSelected = winnerScore === preset.winningScore && loserScore === preset.losingScore;
                return (
                  <button
                    key={labelText}
                    type="button"
                    onClick={() => handleApplyPreset(preset.winningScore, preset.losingScore)}
                    className={`min-h-[44px] rounded-lg border font-mono flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs ${
                      isSelected
                        ? 'silk-btn-primary text-white font-extrabold border-indigo-600'
                        : 'silk-extruded-sm hover:bg-slate-100 border-outline-variant text-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold">{labelText}</span>
                    <span className={`text-[9px] font-semibold uppercase ${isSelected ? 'text-indigo-100' : preset.accent}`}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Deuce & Adjuster */}
          <div className="silk-sunken p-3 rounded-xl border border-outline-variant space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-[10px] font-mono font-bold text-amber-700 uppercase flex items-center gap-1">
                <span>🔥</span>
                <span>Overtime Deuce &amp; Adjuster</span>
              </span>
              <div className="flex items-center gap-1">
                {DEUCE_PRESETS.map(([wPts, lPts]) => {
                  const deuceLabel = `${wPts}-${lPts}`;
                  return (
                    <button
                      key={deuceLabel}
                      type="button"
                      onClick={() => handleApplyPreset(wPts, lPts)}
                      className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-mono text-[10px] font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      {deuceLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between bg-white border border-outline-variant rounded-lg p-2 shadow-2xs">
                <div>
                  <div className="text-[10px] font-mono font-bold text-primary uppercase">Winner</div>
                  <div className="text-[9px] text-slate-500 font-mono">Deuce / Cap</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Decrement Winner Score"
                    onClick={() => handleStepWinnerScore(-1)}
                    className="w-8 h-8 rounded-lg silk-extruded-sm hover:bg-slate-100 border border-outline-variant text-base font-mono font-bold text-slate-800 cursor-pointer flex items-center justify-center active:scale-95"
                  >
                    -
                  </button>
                  <span
                    data-testid="stepper-winner-val"
                    className="w-8 text-center font-mono text-base font-extrabold text-primary"
                  >
                    {winnerScore}
                  </span>
                  <button
                    type="button"
                    aria-label="Increment Winner Score"
                    onClick={() => handleStepWinnerScore(1)}
                    className="w-8 h-8 rounded-lg silk-extruded-sm hover:bg-slate-100 border border-outline-variant text-base font-mono font-bold text-slate-800 cursor-pointer flex items-center justify-center active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white border border-outline-variant rounded-lg p-2 shadow-2xs">
                <div>
                  <div className="text-[10px] font-mono font-bold text-slate-700 uppercase">Runner-Up</div>
                  <div className="text-[9px] text-slate-500 font-mono">Points Scored</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Decrement Runner-Up Score"
                    onClick={() => handleStepLoserScore(-1)}
                    className="w-8 h-8 rounded-lg silk-extruded-sm hover:bg-slate-100 border border-outline-variant text-base font-mono font-bold text-slate-800 cursor-pointer flex items-center justify-center active:scale-95"
                  >
                    -
                  </button>
                  <span
                    data-testid="stepper-loser-val"
                    className="w-8 text-center font-mono text-base font-extrabold text-slate-900"
                  >
                    {loserScore}
                  </span>
                  <button
                    type="button"
                    aria-label="Increment Runner-Up Score"
                    onClick={() => handleStepLoserScore(1)}
                    className="w-8 h-8 rounded-lg silk-extruded-sm hover:bg-slate-100 border border-outline-variant text-base font-mono font-bold text-slate-800 cursor-pointer flex items-center justify-center active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant mb-1">
                <span>Direct Runner-Up Keypad:</span>
                <button
                  type="button"
                  onClick={handleClearLoserDigits}
                  className="text-amber-700 hover:underline font-mono font-bold cursor-pointer"
                >
                  Reset (25)
                </button>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    aria-label={`digit-${digit}`}
                    onClick={() => handleTapLoserDigit(digit)}
                    className="h-8 rounded-lg bg-white hover:bg-slate-50 border border-outline-variant font-mono font-bold text-xs text-slate-800 cursor-pointer active:scale-95 transition-all shadow-2xs"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl silk-extruded-sm hover:bg-slate-100 border border-outline-variant text-slate-700 font-mono font-bold text-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || winnerScore <= loserScore}
              className="silk-btn-primary flex-1 h-9 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-white font-headline-sm font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-98 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
              <span>Record Match Score &amp; Rotate Court</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
