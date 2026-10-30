'use client';

import React, { useState } from 'react';
import {
  QUICK_SCORE_TARGET,
  STANDARD_SET_WIN_SCORE,
} from '@badminque/core';
import {
  CourtStationCard,
  CustomMatchModal,
  MatchHistoryView,
  QuickScoreModal,
  useCourts,
} from '../features/courts';
import { RosterCheckInList } from '../features/roster/RosterCheckInList';
import { useStorage } from '../hooks/useStorage';

export default function CourtsideStationPage(): React.JSX.Element {
  const [mainView, setMainView] = useState<'board' | 'history'>('board');
  const { roster, pendingMatches, isPersistent, refresh } = useStorage();

  const {
    courts,
    activeScoreCourt,
    activeCustomMatchCourtId,
    openScoreModal,
    closeScoreModal,
    openCustomMatchModal,
    closeCustomMatchModal,
    dispatchCourt,
    stageCustomMatch,
    setCourtIdle,
    submitScore,
  } = useCourts({
    roster,
    onRosterChange: refresh,
  });

  const handleScoreSubmit = async (
    courtId: number,
    winner: 'A' | 'B',
    winningScore: number,
    losingScore: number
  ): Promise<void> => {
    await submitScore(courtId, winner, winningScore, losingScore);
    await refresh();
  };

  const queuedPlayersCount = roster.filter((player) => player.status === 'QUEUED').length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-extrabold text-lg shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                  Badminque
                </span>
                <span className="text-slate-600 font-bold">•</span>
                <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Organizer Console
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-100 leading-tight">
                Badminque Courtside Station
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-none">
                Active Roster:
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-100">
                {roster.length} Players{' '}
                <span className="text-emerald-400 text-xs">({queuedPlayersCount} Queued)</span>
              </span>
            </div>

            <div className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-none">
                Pending Sync:
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-amber-400">
                {pendingMatches.length} Pending
              </span>
            </div>

            <div className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs">
              <span className="text-slate-400">Storage:</span>
              <span className={isPersistent ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {isPersistent ? 'Persisted' : 'Standard'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-5 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs sm:text-sm font-extrabold shadow-inner">
            <button
              type="button"
              onClick={() => setMainView('board')}
              className={
                mainView === 'board'
                  ? 'px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 flex items-center gap-2 font-extrabold shadow-md shadow-emerald-500/20 cursor-pointer transition-colors'
                  : 'px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-100 flex items-center gap-2 font-bold cursor-pointer transition-colors'
              }
            >
              <span>Courtside Board</span>
            </button>
            <button
              type="button"
              onClick={() => setMainView('history')}
              className={
                mainView === 'history'
                  ? 'px-4 py-2.5 rounded-xl bg-sky-500 text-slate-950 flex items-center gap-2 font-extrabold shadow-md shadow-sky-500/20 cursor-pointer transition-colors'
                  : 'px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-100 flex items-center gap-2 font-bold cursor-pointer transition-colors'
              }
            >
              <span>Match History ({pendingMatches.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              3-Court Active Grid • {QUICK_SCORE_TARGET}-Point Quick Scoring • Weak-Link Soft Mean Active
            </span>
          </div>
        </div>

        {mainView === 'board' ? (
          <div className="space-y-6">
            {/* 3-Court Active Station Board */}
            <section aria-label="Active Station Board">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span>⚡</span>
                    <span>3-Court Active Station Board</span>
                  </h2>
                  <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full font-bold">
                    Presets: {STANDARD_SET_WIN_SCORE} pts (Standard) / {QUICK_SCORE_TARGET} pts (Quick)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> IN_MATCH
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> PROPOSED
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> SCORE_ENTRY
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> IDLE
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courts.map((court) => (
                  <CourtStationCard
                    key={court.courtId}
                    court={court}
                    onDispatch={dispatchCourt}
                    onEnterScore={openScoreModal}
                    onCustomMatch={openCustomMatchModal}
                    onResetIdle={setCourtIdle}
                  />
                ))}
              </div>
            </section>

            {/* Courtside Check-In & Bench Roster */}
            <section>
              <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
                <span>👥</span>
                <span>Courtside Check-In &amp; Bench Roster</span>
              </h2>
              <RosterCheckInList onRosterChange={refresh} />
            </section>
          </div>
        ) : (
          <MatchHistoryView
            matches={pendingMatches}
            roster={roster}
            onReturnToBoard={() => setMainView('board')}
          />
        )}
      </div>

      {/* Modals */}
      {activeScoreCourt !== null && (
        <QuickScoreModal
          isOpen={true}
          court={activeScoreCourt}
          onClose={closeScoreModal}
          onSubmitScore={handleScoreSubmit}
        />
      )}

      {activeCustomMatchCourtId !== null && (
        <CustomMatchModal
          isOpen={true}
          courtId={activeCustomMatchCourtId}
          availablePlayers={roster.filter((player) => {
            const isAssignedOnOtherCourt = courts.some(
              (court) =>
                court.courtId !== activeCustomMatchCourtId &&
                court.state !== 'IDLE' &&
                [...(court.teamA ?? []), ...(court.teamB ?? [])].some(
                  (onCourtPlayer) => onCourtPlayer.id === player.id
                )
            );
            return !isAssignedOnOtherCourt && player.status !== 'PLAYING';
          })}
          onClose={closeCustomMatchModal}
          onConfirmMatch={(courtId, teamA, teamB) => {
            void stageCustomMatch(courtId, teamA, teamB);
          }}
        />
      )}

      <footer className="mt-auto py-4 border-t border-slate-800 text-center text-xs text-slate-400">
        Badminque v0.1.0 • Universal Badminton Skill Transparency
      </footer>
    </main>
  );
}
