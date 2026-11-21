'use client';

import React, { useEffect, useState } from 'react';
import {
  QUICK_SCORE_TARGET,
  STANDARD_SET_WIN_SCORE,
  getTierDubr,
  getTierRating,
  type RosterPlayer,
  type RotationPolicy,
} from '@badminque/core';
import { ClaimTokenModal } from '../features/claims';
import {
  CourtStationCard,
  CustomMatchModal,
  MatchHistoryView,
  OnDeckStagingPool,
  QuickScoreModal,
  useCourts,
} from '../features/courts';
import { ClubLeaderboardView } from '../features/leaderboard';
import { PlayerPassportModal } from '../features/passport';
import { PlayerTouchActionSheet, RosterCheckInList, RosterCheckInModal } from '../features/roster';
import { SyncStatusIndicator, useSync } from '../features/sync';
import { useStorage } from '../hooks/useStorage';
import { seedMockData } from '../services/mockFixtures';
import { storageService } from '../services/storageService';

export default function CourtsideStationPage(): React.JSX.Element {
  const [mainView, setMainView] = useState<'board' | 'history' | 'leaderboard'>('board');
  const [customMatchTargetSlot, setCustomMatchTargetSlot] = useState<number | null>(null);
  const [selectedActionSheetPlayer, setSelectedActionSheetPlayer] = useState<RosterPlayer | null>(null);
  const [claimTokenPlayer, setClaimTokenPlayer] = useState<RosterPlayer | null>(null);
  const [passportPlayer, setPassportPlayer] = useState<RosterPlayer | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isQuickCheckInModalOpen, setIsQuickCheckInModalOpen] = useState<boolean>(false);
  const { roster, pendingMatches, refresh } = useStorage();

  const clubNightId = 'default-club-night';
  const {
    isOnline,
    isSyncing,
    syncError,
    syncNow,
    refreshPendingCount,
  } = useSync({ clubNightId });

  const {
    courts,
    activeScoreCourt,
    activeCustomMatchCourtId,
    activePolicy,
    setRotationPolicy,
    onDeckGroups,
    openScoreModal,
    closeScoreModal,
    openCustomMatchModal,
    closeCustomMatchModal,
    dispatchCourt,
    dispatchDeckMatch,
    stageCustomMatch,
    stageCustomSlot3,
    pinPlayerPair,
    unpinPlayerPair,
    togglePlayerSkip,
    togglePlayerRest,
    assignPlayerToCourt,
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
    await refreshPendingCount();
  };

  const handleCloseCustomMatchModal = (): void => {
    closeCustomMatchModal();
    setCustomMatchTargetSlot(null);
  };

  const activeActionPlayer = selectedActionSheetPlayer
    ? roster.find((p) => p.id === selectedActionSheetPlayer.id) ?? selectedActionSheetPlayer
    : null;

  const queuedPlayersCount = roster.filter((player) => player.status === 'QUEUED').length;

  const handleSeedDemoData = async (): Promise<void> => {
    await seedMockData(storageService);
    await refresh();
  };

  const handleAutoDispatch = (): void => {
    const targetCourt = courts.find((c) => c.state === 'IDLE' || c.state === 'PROPOSED');
    if (targetCourt) {
      dispatchCourt(targetCourt.courtId);
    }
  };

  // Keyboard Shortcuts Listener (Spreadsheet Hotkeys Paradigm)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        closeScoreModal();
        handleCloseCustomMatchModal();
        setIsHelpModalOpen(false);
        setIsQuickCheckInModalOpen(false);
        setSelectedActionSheetPlayer(null);
        setClaimTokenPlayer(null);
        setPassportPlayer(null);
        if (isInput) (activeEl as HTMLElement).blur();
        return;
      }

      if (isInput) return;

      if (e.key === '1') {
        e.preventDefault();
        const court1 = courts.find((c) => c.courtId === 1);
        if (court1?.state === 'SCORE_ENTRY') openScoreModal(1);
      } else if (e.key === '2') {
        e.preventDefault();
        const court2 = courts.find((c) => c.courtId === 2);
        if (court2?.state === 'SCORE_ENTRY') openScoreModal(2);
      } else if (e.key === '3') {
        e.preventDefault();
        const court3 = courts.find((c) => c.courtId === 3);
        if (court3?.state === 'SCORE_ENTRY') openScoreModal(3);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleAutoDispatch();
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        searchInput?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsQuickCheckInModalOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setIsHelpModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [courts, openScoreModal, closeScoreModal]);

  return (
    <div className="min-h-screen bg-surface font-body-base text-on-surface flex flex-col justify-between antialiased selection:bg-primary selection:text-white">
      {/* 1. Google Stitch Compact Telemetry App Bar (~46px) */}
      <header className="h-11 flex-shrink-0 bg-white border-b border-outline-variant px-3 flex items-center justify-between gap-2 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Logo & Mode */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg silk-btn-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[15px]">sports_tennis</span>
            </div>
            <span className="font-headline-md font-extrabold uppercase tracking-tight text-slate-900 text-[13px]">
              Badminque
            </span>
            <span className="font-mono-badge text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-600 text-white font-bold uppercase tracking-wider">
              STATION OS
            </span>
            <span className="sr-only">Badminque Courtside Station</span>
          </div>

          {/* Session Title Chip */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg silk-sunken-shallow text-[11px] border border-outline-variant">
            <span className="material-symbols-outlined text-indigo-600 text-[14px]">event_note</span>
            <span className="text-on-surface-variant font-medium">Club Night:</span>
            <span className="font-mono text-slate-900 font-semibold">Friday Night Smashers #42</span>
          </div>

          {/* Quick Operational Metrics */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg silk-extruded-sm border border-outline-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-800 font-mono font-medium">3 Courts</span>
              <span className="text-[9px] text-indigo-600 hidden md:inline font-semibold">
                (2 In Play, 1 Enter Score)
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg silk-extruded-sm border border-outline-variant">
              <span className="material-symbols-outlined text-slate-500 text-[13px]">groups</span>
              <span className="text-[10px] font-mono text-slate-700">
                {roster.length} Players{' '}
                <span className="text-emerald-600 font-bold">({queuedPlayersCount} Queued)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Shortcuts Pills & Organiser Triggers */}
        <div className="flex items-center gap-1.5">
          {roster.length === 0 && (
            <button
              type="button"
              onClick={() => void handleSeedDemoData()}
              className="h-7 px-2.5 rounded-lg silk-btn-primary text-white font-headline-sm font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
              title="Seed sample players across Beginner, Intermediate, and Advanced tiers"
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>Seed Demo Roster</span>
            </button>
          )}

          {/* Rotation Policy Dropdown */}
          <div className="h-7 px-2 rounded-lg silk-sunken-shallow border border-outline-variant flex items-center gap-1 text-[11px]">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Policy:</span>
            <select
              aria-label="Select rotation policy"
              value={activePolicy}
              onChange={(e) => setRotationPolicy(e.target.value as RotationPolicy)}
              className="bg-transparent font-mono text-[11px] font-bold text-indigo-700 focus:outline-none cursor-pointer"
            >
              <option value="FAIR_PLAY">Fair Play Pegboard</option>
              <option value="SPLIT_AND_MIX">Split &amp; Mix</option>
              <option value="COURT_LADDER">Court Ladder</option>
              <option value="FLIGHTED_TIERS">Flighted Tiers</option>
            </select>
          </div>

          <SyncStatusIndicator
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={pendingMatches.length}
            syncError={syncError}
            onSyncNow={async () => {
              await syncNow();
              await refresh();
            }}
          />

          <div className="hidden xl:flex items-center gap-1 text-[10px] text-on-surface-variant font-mono">
            <button
              type="button"
              className="px-2 py-0.5 rounded-lg silk-extruded-sm hover:text-primary hover:bg-slate-100 text-slate-700 border border-outline-variant active:scale-95 transition-all cursor-pointer"
              onClick={() => setIsHelpModalOpen(true)}
            >
              <kbd className="font-bold text-primary">[?]</kbd> Shortcuts
            </button>
            <button
              type="button"
              className="px-2 py-0.5 rounded-lg silk-extruded-sm hover:text-slate-900 hover:bg-slate-100 text-slate-700 border border-outline-variant active:scale-95 transition-all cursor-pointer"
              onClick={handleAutoDispatch}
            >
              <kbd className="font-bold text-slate-600">[Space]</kbd> Auto-Dispatch
            </button>
          </div>

          <button
            type="button"
            className="h-7 px-3 rounded-lg silk-btn-primary active:scale-95 text-white font-headline-sm font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
            onClick={handleAutoDispatch}
          >
            <span className="material-symbols-outlined text-[15px]">bolt</span>
            <span>Auto-Dispatch</span>
          </button>

          <button
            type="button"
            className="h-7 px-2.5 rounded-lg silk-extruded-sm hover:bg-slate-100 active:scale-95 text-slate-800 font-headline-sm font-semibold text-[11px] flex items-center gap-1 border border-outline-variant transition-all cursor-pointer"
            onClick={() => setIsQuickCheckInModalOpen(true)}
          >
            <span className="material-symbols-outlined text-primary text-[15px]">person_add</span>
            <span>Check-In <kbd className="text-on-surface-variant text-[9px] font-mono">[N]</kbd></span>
          </button>
        </div>
      </header>

      {/* 2. Main Operational Cockpit */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto p-2 gap-2.5 flex flex-col min-h-0 bg-surface">
        {/* Navigation Tabs Sub-Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-outline-variant pb-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-outline-variant text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setMainView('board')}
              className={
                mainView === 'board'
                  ? 'px-3 py-1 rounded-lg bg-white text-indigo-700 font-extrabold shadow-xs cursor-pointer border border-outline-variant transition-colors'
                  : 'px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 font-bold cursor-pointer transition-colors'
              }
            >
              <span>Courtside Board</span>
            </button>
            <button
              type="button"
              onClick={() => setMainView('history')}
              className={
                mainView === 'history'
                  ? 'px-3 py-1 rounded-lg bg-white text-sky-700 font-extrabold shadow-xs cursor-pointer border border-outline-variant transition-colors'
                  : 'px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 font-bold cursor-pointer transition-colors'
              }
            >
              <span>Match History ({pendingMatches.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMainView('leaderboard')}
              className={
                mainView === 'leaderboard'
                  ? 'px-3 py-1 rounded-lg bg-indigo-600 text-white font-extrabold shadow-xs cursor-pointer transition-colors'
                  : 'px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 font-bold cursor-pointer transition-colors'
              }
            >
              <span>Club Leaderboard</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-on-surface-variant font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              3-Court Matrix • {QUICK_SCORE_TARGET}p Quick Scoring • {STANDARD_SET_WIN_SCORE}p Standard
            </span>
          </div>
        </div>

        {mainView === 'board' ? (
          <div className="flex-1 flex flex-col gap-2.5 min-h-0">
            {/* Top Section: Ultra-Compact 3-Court Active Matrix */}
            <section aria-label="Active Station Board" className="flex-shrink-0">
              <div className="flex items-center justify-between pb-1">
                <h2 className="text-xs font-headline-sm font-extrabold uppercase tracking-tight text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[15px]">bolt</span>
                  <span>3-Court Active Station Board</span>
                </h2>
                <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> IN_MATCH
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> SCORE_ENTRY
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> PROPOSED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {courts.map((court) => (
                  <CourtStationCard
                    key={court.courtId}
                    court={court}
                    onDispatch={dispatchCourt}
                    onEnterScore={openScoreModal}
                    onCustomMatch={(courtId) => {
                      setCustomMatchTargetSlot(null);
                      openCustomMatchModal(courtId);
                    }}
                    onResetIdle={setCourtIdle}
                  />
                ))}
              </div>
            </section>

            {/* Lower Section: Split 2-Column Dense Operational Pane */}
            <section aria-label="Staging & Bench Roster" className="flex-1 grid grid-cols-12 gap-2.5 min-h-0">
              {/* Left Column: On-Deck Staging Queue (5 cols) */}
              <div className="col-span-12 lg:col-span-5 silk-extruded rounded-xl p-2.5 min-h-0 flex flex-col border border-outline-variant shadow-xs">
                <OnDeckStagingPool
                  onDeckGroups={onDeckGroups}
                  onDispatchToCourt={dispatchDeckMatch}
                  onOpenCustomBuilder={(slotIndex) => {
                    setCustomMatchTargetSlot(slotIndex);
                    openCustomMatchModal(1);
                  }}
                />
              </div>

              {/* Right Column: Courtside Bench Roster (7 cols) */}
              <div className="col-span-12 lg:col-span-7 silk-extruded rounded-xl p-2.5 min-h-0 flex flex-col border border-outline-variant shadow-xs">
                <h2 className="text-xs font-headline-sm font-extrabold uppercase tracking-tight text-slate-900 mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[15px]">groups</span>
                  <span>Courtside Check-In &amp; Bench Roster</span>
                </h2>
                <RosterCheckInList
                  roster={roster}
                  onRosterChange={refresh}
                  onSelectPlayer={(player) => setSelectedActionSheetPlayer(player)}
                />
              </div>
            </section>
          </div>
        ) : mainView === 'history' ? (
          <MatchHistoryView
            matches={pendingMatches}
            roster={roster}
            onReturnToBoard={() => setMainView('board')}
          />
        ) : (
          <ClubLeaderboardView
            roster={roster}
            onSelectPlayer={(player) => setPassportPlayer(player)}
          />
        )}
      </main>

      {/* 3. Bottom Excel-Style Status & Shortcut Bar (~28px) */}
      <footer className="h-7 flex-shrink-0 bg-white border-t border-outline-variant px-3 flex items-center justify-between text-[10px] font-mono text-on-surface-variant z-20">
        <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> READY
          </span>
          <span className="text-slate-800 font-semibold">HOTKEYS:</span>
          <span><kbd className="text-slate-800 bg-slate-100 px-1 py-0.2 rounded font-bold border border-outline-variant">[1-3]</kbd> Select Court</span>
          <span><kbd className="text-slate-800 bg-slate-100 px-1 py-0.2 rounded font-bold border border-outline-variant">[Enter]</kbd> Enter Score</span>
          <span><kbd className="text-slate-800 bg-slate-100 px-1 py-0.2 rounded font-bold border border-outline-variant">[Space]</kbd> Auto-Dispatch</span>
          <span><kbd className="text-slate-800 bg-slate-100 px-1 py-0.2 rounded font-bold border border-outline-variant">[/]</kbd> Find</span>
          <span><kbd className="text-slate-800 bg-slate-100 px-1 py-0.2 rounded font-bold border border-outline-variant">[N]</kbd> Check-In</span>
          <span><kbd className="text-slate-800 bg-slate-100 px-1 py-0.2 rounded font-bold border border-outline-variant">[?]</kbd> Shortcuts</span>
          <span><kbd className="text-slate-800 bg-slate-100 px-1 py-0.2 rounded font-bold border border-outline-variant">[Esc]</kbd> Dismiss</span>
        </div>
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <span>Badminque v0.1.0 • Universal Badminton Skill Transparency</span>
          <span className="text-primary font-bold">Silk Station OS</span>
        </div>
      </footer>

      {/* Modals & Dialogs */}
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
          targetSlot={customMatchTargetSlot}
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
          onClose={handleCloseCustomMatchModal}
          onConfirmMatch={(courtId, teamA, teamB) => {
            void stageCustomMatch(courtId, teamA, teamB);
          }}
          onConfirmSlotStage={(_slotIndex, teamA, teamB) => {
            stageCustomSlot3(teamA, teamB);
          }}
        />
      )}

      {/* Player Touch Action Sheet */}
      <PlayerTouchActionSheet
        isOpen={activeActionPlayer !== null}
        player={activeActionPlayer}
        roster={roster}
        courts={courts}
        onClose={() => setSelectedActionSheetPlayer(null)}
        onAssignToCourt={async (playerId, courtId) => {
          await assignPlayerToCourt(playerId, courtId);
          setSelectedActionSheetPlayer(null);
        }}
        onToggleSkip={async (playerId) => {
          await togglePlayerSkip(playerId);
        }}
        onToggleRest={async (playerId) => {
          await togglePlayerRest(playerId);
        }}
        onPinPair={async (playerAId, playerBId) => {
          await pinPlayerPair(playerAId, playerBId);
          setSelectedActionSheetPlayer(null);
        }}
        onUnpinPair={async (playerId) => {
          await unpinPlayerPair(playerId);
          setSelectedActionSheetPlayer(null);
        }}
        onOpenClaimToken={(player) => {
          setSelectedActionSheetPlayer(null);
          setClaimTokenPlayer(player);
        }}
        onOpenPassport={(player) => {
          setSelectedActionSheetPlayer(null);
          setPassportPlayer(player);
        }}
      />

      {/* Tricount Claim Token & Passport Modals */}
      <ClaimTokenModal
        isOpen={claimTokenPlayer !== null}
        player={claimTokenPlayer}
        onClose={() => setClaimTokenPlayer(null)}
      />

      <PlayerPassportModal
        isOpen={passportPlayer !== null}
        player={passportPlayer}
        onClose={() => setPassportPlayer(null)}
      />

      {/* Detailed Check-In Modal [N] */}
      <RosterCheckInModal
        isOpen={isQuickCheckInModalOpen}
        onClose={() => setIsQuickCheckInModalOpen(false)}
        onCheckIn={async (name, tier) => {
          const baselineRating = getTierRating(tier);
          const baselineDubr = getTierDubr(tier);
          await storageService.savePlayer({
            id: crypto.randomUUID(),
            name,
            auth_user_id: null,
            singles_rating: baselineRating,
            doubles_rating: baselineRating,
            singles_dubr: baselineDubr,
            doubles_dubr: baselineDubr,
            initial_tier: tier,
            matches_played: 0,
            status: 'QUEUED',
            checked_in_at: new Date().toISOString(),
          });
          await refresh();
        }}
      />

      {/* Shortcuts Help Modal [?] */}
      {isHelpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl silk-extruded border border-outline-variant p-5 shadow-2xl flex flex-col gap-3.5 bg-white">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">keyboard</span>
                <h3 className="font-headline-sm font-extrabold text-slate-900 text-sm uppercase">
                  Station OS Keyboard Hotkeys
                </h3>
              </div>
              <button
                type="button"
                className="w-7 h-7 rounded-lg silk-extruded-sm text-on-surface-variant flex items-center justify-center border border-outline-variant cursor-pointer active:scale-95"
                onClick={() => setIsHelpModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="silk-sunken-shallow p-2 rounded-xl border border-outline-variant flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">Score Court 1 / 2 / 3</span>
                <kbd className="text-primary font-bold bg-white px-1.5 py-0.5 rounded border border-outline-variant shadow-2xs">
                  [1] [2] [3]
                </kbd>
              </div>
              <div className="silk-sunken-shallow p-2 rounded-xl border border-outline-variant flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">Auto-Dispatch Courts</span>
                <kbd className="text-primary font-bold bg-white px-1.5 py-0.5 rounded border border-outline-variant shadow-2xs">
                  [Space]
                </kbd>
              </div>
              <div className="silk-sunken-shallow p-2 rounded-xl border border-outline-variant flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">Focus Player Search</span>
                <kbd className="text-primary font-bold bg-white px-1.5 py-0.5 rounded border border-outline-variant shadow-2xs">
                  [/]
                </kbd>
              </div>
              <div className="silk-sunken-shallow p-2 rounded-xl border border-outline-variant flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">Quick Check-In</span>
                <kbd className="text-primary font-bold bg-white px-1.5 py-0.5 rounded border border-outline-variant shadow-2xs">
                  [N]
                </kbd>
              </div>
              <div className="silk-sunken-shallow p-2 rounded-xl border border-outline-variant flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">Close Any Modal</span>
                <kbd className="text-primary font-bold bg-white px-1.5 py-0.5 rounded border border-outline-variant shadow-2xs">
                  [Esc]
                </kbd>
              </div>
              <div className="silk-sunken-shallow p-2 rounded-xl border border-outline-variant flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">Toggle Shortcuts Help</span>
                <kbd className="text-primary font-bold bg-white px-1.5 py-0.5 rounded border border-outline-variant shadow-2xs">
                  [?]
                </kbd>
              </div>
            </div>
            <div className="p-2 rounded-xl silk-sunken-shallow text-[10px] text-on-surface-variant border border-outline-variant">
              Silk Light operational mode engineered for courtside tablet stands, sunlight visibility, and Bluetooth keypads.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
