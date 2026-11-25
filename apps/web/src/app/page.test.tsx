import React, { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CourtsideStationPage from './page';
import { closeDatabaseConnection, storageService } from '../services/storageService';

describe('CourtsideStationPage', () => {
  beforeEach(async () => {
    closeDatabaseConnection();
    await storageService.clearAll();
  });

  it('renders courtside station header, 3 court stations, and check-in section', async () => {
    render(<CourtsideStationPage />);

    expect(screen.getByText('Badminque Courtside Station')).toBeInTheDocument();
    expect(screen.getByText('Court 1 • Show Court')).toBeInTheDocument();
    expect(screen.getByText('Court 2 • Center')).toBeInTheDocument();
    expect(screen.getByText('Court 3 • Far Side')).toBeInTheDocument();
    expect(
      screen.getByText(/Courtside Check-In & Bench Roster/i)
    ).toBeInTheDocument();

    // Navigation tabs
    expect(screen.getByRole('button', { name: /Courtside Board/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Match History \(0\)/i })).toBeInTheDocument();
  });

  it('allows organizer to check in a player directly on courtside station', async () => {
    render(<CourtsideStationPage />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    fireEvent.change(input, { target: { value: 'Anthony Ginting' } });
    fireEvent.click(addButton);

    expect(await screen.findByText('Anthony Ginting')).toBeInTheDocument();

    // Roster count badges updated
    expect(await screen.findByText(/1 Players/i)).toBeInTheDocument();
  });

  it('allows organizer to seed sample roster with 1-tap in offline demo mode', async () => {
    render(<CourtsideStationPage />);

    const seedButton = screen.getByRole('button', { name: /Seed Demo Roster/i });
    expect(seedButton).toBeInTheDocument();

    fireEvent.click(seedButton);

    expect(await screen.findByText(/12 Players/i)).toBeInTheDocument();
    expect((await screen.findAllByText('Viktor Axelsen')).length).toBeGreaterThanOrEqual(1);
    expect(
      await screen.findByRole('button', { name: /Re-Seed Demo/i }, { timeout: 3000 })
    ).toBeInTheDocument();
  });

  it('completes full match cycle: active play, 30-point preset scoring, Badminton Stamina Invariant step-off, and court rotation', async () => {
    render(<CourtsideStationPage />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    // Check in 8 players: p1..p4 will be first match, p5..p8 will be next queued
    const playerNames = [
      'Viktor Axelsen',
      'Anders Antonsen',
      'Lee Zii Jia',
      'Loh Kean Yew',
      'Kento Momota',
      'Chou Tien Chen',
      'Jonatan Christie',
      'Anthony Ginting',
    ];

    for (const name of playerNames) {
      fireEvent.change(input, { target: { value: name } });
      fireEvent.click(addButton);
      expect((await screen.findAllByText(name, {}, { timeout: 3000 })).length).toBeGreaterThanOrEqual(1);
    }

    // 1. Dispatch Court 1 from IDLE -> IN_MATCH
    const dispatchButtons = screen.getAllByRole('button', { name: /⚡ Dispatch/i });
    const firstDispatchButton = dispatchButtons[0];
    if (!firstDispatchButton) {
      throw new Error('Expected at least one dispatch button');
    }

    await act(async () => {
      fireEvent.click(firstDispatchButton);
    });

    // Court 1 should now be IN_MATCH with live elapsed timer and enter score button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enter Score \(30 pts\)/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();

    // 2. Open 30-point QuickScoreModal
    const enterScoreBtn = screen.getByRole('button', {
      name: /Enter Score \(30 pts\)/i,
    });
    fireEvent.click(enterScoreBtn);

    // Modal is open with 30-pt presets
    expect(
      screen.getByText(/30-Point Match Score Entry/i)
    ).toBeInTheDocument();
    expect(screen.getByText('COURT 1')).toBeInTheDocument();

    // 3. Select 1-tap 30-point preset: 30-25
    const presetBtn = screen.getByRole('button', { name: /30-25/i });
    fireEvent.click(presetBtn);

    // 4. Submit recorded score & rotate court (<5 seconds interaction)
    const submitBtn = screen.getByRole('button', {
      name: /Record Match Score & Rotate Court/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByText(/30-Point Match Score Entry/i)).not.toBeInTheDocument();
    });

    // 5. Badminton Stamina Invariant:
    // Cleared court transitions to PROPOSED state because 4 waiting queued players remain
    expect(await screen.findByLabelText(/Clear to Idle/i)).toBeInTheDocument();
    expect(screen.getAllByText('Kento Momota').length).toBeGreaterThanOrEqual(2);

    // Pending Sync counter increments to 1
    expect(screen.getByText(/1 Pending/i)).toBeInTheDocument();

    // 6. Switch to Match History tab and verify recorded match log
    const historyTab = screen.getByRole('button', { name: /Match History \(1\)/i });
    fireEvent.click(historyTab);

    expect(screen.getByText(/Club Night Official Match Log/i)).toBeInTheDocument();
    expect(screen.getByText('Team A Won')).toBeInTheDocument();
    expect(screen.getAllByText('30 - 25')).toHaveLength(2);
  });

  it('renders rotation policy selector and On-Deck Staging Pool with 1-tap dispatch', async () => {
    render(<CourtsideStationPage />);

    // 1. Verify rotation policy selector
    const policySelect = screen.getByLabelText(/Select rotation policy/i);
    expect(policySelect).toBeInTheDocument();
    expect(policySelect).toHaveValue('FAIR_PLAY');

    // Switch policy to SPLIT_AND_MIX
    fireEvent.change(policySelect, { target: { value: 'SPLIT_AND_MIX' } });
    expect(policySelect).toHaveValue('SPLIT_AND_MIX');

    // Switch policy to COURT_LADDER
    fireEvent.change(policySelect, { target: { value: 'COURT_LADDER' } });
    expect(policySelect).toHaveValue('COURT_LADDER');

    // 2. Verify On-Deck Staging Pool section exists
    expect(screen.getByText('On-Deck Staging Pool')).toBeInTheDocument();
    expect(screen.getByText('Next Up')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('In the Hole')).toBeInTheDocument();

    // 3. Check in 8 players to verify On-Deck staging pool displays two pre-grouped matches
    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    const playerNames = [
      'Player A',
      'Player B',
      'Player C',
      'Player D',
      'Player E',
      'Player F',
      'Player G',
      'Player H',
    ];

    for (const name of playerNames) {
      fireEvent.change(input, { target: { value: name } });
      fireEvent.click(addButton);
      expect((await screen.findAllByText(name, {}, { timeout: 3000 })).length).toBeGreaterThanOrEqual(1);
    }

    // Both Slot 1 ("Next Up") and Slot 2 ("Following") have 1-tap dispatch buttons
    const deckDispatchButtons = screen.getAllByRole('button', { name: /⚡ Dispatch to Court/i });
    expect(deckDispatchButtons.length).toBeGreaterThanOrEqual(2);

    // 4. 1-tap dispatch from On-Deck pool
    await act(async () => {
      fireEvent.click(deckDispatchButtons[0] as HTMLElement);
    });

    // Court 1 should now be IN_MATCH with live score button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enter Score \(30 pts\)/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Court 1 • Show Court')).toBeInTheDocument();
  });

  it('supports organizer overrides: touch action sheet, pair pinning, 1-match skip, and slot 3 custom staging', async () => {
    render(<CourtsideStationPage />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    const playerNames = ['Player Alpha', 'Player Beta', 'Player Gamma', 'Player Delta'];
    for (const name of playerNames) {
      fireEvent.change(input, { target: { value: name } });
      fireEvent.click(addButton);
      expect((await screen.findAllByText(name, {}, { timeout: 3000 })).length).toBeGreaterThanOrEqual(1);
    }

    // 1. Open Player Touch Action Sheet for Player Alpha
    const manageButton = screen.getByRole('button', { name: /Open action sheet for Player Alpha/i });
    fireEvent.click(manageButton);

    // Action sheet modal is open
    expect(await screen.findByText(/Player Quick Actions/i)).toBeInTheDocument();
    expect(screen.getAllByText('Player Alpha').length).toBeGreaterThanOrEqual(1);

    // 2. Pin Player Alpha with Player Beta
    const partnerSelect = screen.getByLabelText(/Select partner to pin/i);
    const latestRoster = await storageService.getRoster();
    const betaId = latestRoster.find((p) => p.name === 'Player Beta')?.id;
    fireEvent.change(partnerSelect, { target: { value: betaId } });

    const lockButton = screen.getByRole('button', { name: /Pin Locked Pair/i });
    await act(async () => {
      fireEvent.click(lockButton);
    });

    // Action sheet closes after pinning, badge shows pinned partner
    await waitFor(() => {
      expect(screen.queryByText(/Player Quick Actions/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Pinned to Player Beta/i)).toBeInTheDocument();

    // 3. Assemble Custom Match for Slot 3 from On-Deck Pool
    const assembleCustomBtn = screen.getByRole('button', { name: /\+ Assemble Custom Match/i });
    fireEvent.click(assembleCustomBtn);

    // Custom Match Modal is open with destination On-Deck Slot 3
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByRole('heading', { name: /Assemble Custom Match/i })).toBeInTheDocument();
    expect(within(modal).getAllByText(/On-Deck Slot 3 \(Custom Staging\)/i).length).toBeGreaterThanOrEqual(1);

    // Auto-pick top 4
    const autoPickBtn = within(modal).getByRole('button', { name: /Auto-Pick Top 4/i });
    fireEvent.click(autoPickBtn);

    // Stage Match to On-Deck Slot 3
    const stageButton = within(modal).getByRole('button', {
      name: /Stage Match to On-Deck Slot 3 \(Custom Staging\)/i,
    });
    await act(async () => {
      fireEvent.click(stageButton);
    });

    // Modal closes, Slot 3 card now shows staged match and [Edit Pairs] & [Send C1]
    await waitFor(() => {
      expect(screen.queryByText(/Assemble Custom Match/i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Edit Pairs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send C1/i })).toBeInTheDocument();
  });

  it('renders online/offline sync status indicator and reflects pending matches', async () => {
    render(<CourtsideStationPage />);

    // Initially online with 0 pending matches
    expect(await screen.findByText('Online (Synced)')).toBeInTheDocument();

    // Check in 4 players and dispatch + complete match
    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });
    for (const name of ['Sync P1', 'Sync P2', 'Sync P3', 'Sync P4']) {
      fireEvent.change(input, { target: { value: name } });
      fireEvent.click(addButton);
      expect((await screen.findAllByText(name, {}, { timeout: 3000 })).length).toBeGreaterThanOrEqual(1);
    }

    const dispatchButtons = screen.getAllByRole('button', { name: /⚡ Dispatch/i });
    const firstDispatch = dispatchButtons[0];
    if (!firstDispatch) {
      throw new Error('Expected dispatch button');
    }

    await act(async () => {
      fireEvent.click(firstDispatch);
    });

    const enterScoreBtn = await screen.findByRole('button', {
      name: /Enter Score \(30 pts\)/i,
    });
    fireEvent.click(enterScoreBtn);

    const presetBtn = await screen.findByRole('button', { name: /30-25/i });
    fireEvent.click(presetBtn);

    const submitBtn = screen.getByRole('button', {
      name: /Record Match Score & Rotate Court/i,
    });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Match is now completed and buffered offline in IndexedDB
    expect(await screen.findByText('Online (1 Pending)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sync Now/i })).toBeInTheDocument();
  });

  it('switches to Club Leaderboard view and opens Claim Token modal from player touch action sheet', async () => {
    render(<CourtsideStationPage />);

    // 1. Switch to Club Leaderboard view
    const leaderboardTab = screen.getByRole('button', { name: /Club Leaderboard/i });
    fireEvent.click(leaderboardTab);

    expect(screen.getByText(/Official Club Leaderboard/i)).toBeInTheDocument();

    // 2. Return to Courtside Board
    const boardTab = screen.getByRole('button', { name: /Courtside Board/i });
    fireEvent.click(boardTab);

    // 3. Add player and open their action sheet
    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });
    fireEvent.change(input, { target: { value: 'Lee Chong Wei' } });
    fireEvent.click(addButton);

    const playerRow = await screen.findByText('Lee Chong Wei');
    fireEvent.click(playerRow);

    // 4. Action sheet shows Claim Token button
    const claimBtn = await screen.findByRole('button', { name: /Claim Token QR/i });
    fireEvent.click(claimBtn);

    // Claim modal is open
    expect(await screen.findByText(/Claim Player Passport/i)).toBeInTheDocument();
    expect(screen.getByText(/48-hour expiration/i)).toBeInTheDocument();

    const closeClaimBtn = screen.getByRole('button', { name: /Close claim modal/i });
    fireEvent.click(closeClaimBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Claim Player Passport/i)).not.toBeInTheDocument();
    });
  });

  it('allows organizer to create and switch to a real UUID Club Night session in cockpit header', async () => {
    render(<CourtsideStationPage />);

    const sessionBtn = await screen.findByRole('button', {
      name: /Club Night:/i,
    });
    fireEvent.click(sessionBtn);

    expect(await screen.findByText(/Switch or Start Club Night/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Club Name/i), {
      target: { value: 'Sunday Shuttle Club' },
    });
    fireEvent.change(screen.getByLabelText(/Session Date/i), {
      target: { value: '2026-11-29' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Start Club Night/i }));
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/Switch or Start Club Night/i)
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Sunday Shuttle Club/i)).toBeInTheDocument();

    const active = await storageService.getActiveSession();
    expect(active?.club_name).toBe('Sunday Shuttle Club');
    expect(active?.id).not.toBe('default-club-night');
  });

  it('hydrates remote club players into Bench Roster using active session club_id without overwriting offline additions', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://badminque-api.koyeb.app');
    const clubId = '33333333-3333-4333-8333-333333333331';

    await storageService.saveActiveSession({
      id: '33333333-3333-4333-8333-333333333332',
      club_id: clubId,
      club_name: 'Issue 33 Hydration Club',
      date: '2026-11-25',
      status: 'ACTIVE',
      created_at: '2026-11-25T10:00:00.000Z',
      sync_status: 'SYNCED',
    });

    await storageService.savePlayer({
      id: '33333333-3333-4333-8333-333333333399',
      club_id: clubId,
      name: 'Offline Olivia',
      auth_user_id: null,
      initial_tier: 'INTERMEDIATE',
      singles_rating: 1400,
      doubles_rating: 1400,
      singles_dubr: 3.5,
      doubles_dubr: 3.5,
      matches_played: 0,
      status: 'QUEUED',
      checked_in_at: '2026-11-25T10:05:00.000Z',
    });

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith(`/api/v1/clubs/${clubId}/players`)) {
        return {
          ok: true,
          json: async () => [
            {
              id: '33333333-3333-4333-8333-333333333388',
              club_id: clubId,
              name: 'Remote Ratchanok',
              auth_user_id: null,
              initial_tier: 'ADVANCED',
              singles_rating: 1800,
              doubles_rating: 1800,
              singles_dubr: 4.5,
              doubles_dubr: 4.5,
              matches_played: 0,
              status: 'QUEUED',
              created_at: '2026-11-25T09:00:00.000Z',
            },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      render(<CourtsideStationPage />);

      expect((await screen.findAllByText('Remote Ratchanok', {}, { timeout: 3000 })).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Offline Olivia').length).toBeGreaterThanOrEqual(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://badminque-api.koyeb.app/api/v1/clubs/${clubId}/players`
      );
    } finally {
      globalThis.fetch = originalFetch;
      vi.unstubAllEnvs();
    }
  });

  it('syncs Quick Check-In Modal check-in to POST /api/v1/clubs/{club_id}/players via NEXT_PUBLIC_API_URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://badminque-api.koyeb.app');
    const clubId = '44444444-4444-4444-8444-444444444441';

    await storageService.saveActiveSession({
      id: '44444444-4444-4444-8444-444444444442',
      club_id: clubId,
      club_name: 'Issue 33 Check-In Club',
      date: '2026-11-25',
      status: 'ACTIVE',
      created_at: '2026-11-25T10:00:00.000Z',
      sync_status: 'SYNCED',
    });

    const postedBodies: Array<{ url: string; body: Record<string, unknown> }> = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && typeof init.body === 'string') {
        postedBodies.push({
          url,
          body: JSON.parse(init.body) as Record<string, unknown>,
        });
      }
      return { ok: true, json: async () => [] };
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      render(<CourtsideStationPage />);

      expect(await screen.findByText(/Issue 33 Check-In Club/i)).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'n' });
      const modal = await screen.findByRole('dialog');

      fireEvent.change(within(modal).getByLabelText(/Player Name/i), {
        target: { value: 'Modal Mia' },
      });
      fireEvent.click(within(modal).getByRole('radio', { name: /Advanced/i }));

      await act(async () => {
        fireEvent.click(within(modal).getByRole('button', { name: /Check In Player/i }));
      });

      expect((await screen.findAllByText('Modal Mia', {}, { timeout: 3000 })).length).toBeGreaterThanOrEqual(1);
      await waitFor(() => {
        expect(
          postedBodies.some(
            (call) =>
              call.url === `https://badminque-api.koyeb.app/api/v1/clubs/${clubId}/players` &&
              call.body.name === 'Modal Mia' &&
              call.body.initial_tier === 'ADVANCED' &&
              call.body.doubles_dubr === 4.5
          )
        ).toBe(true);
      });
    } finally {
      globalThis.fetch = originalFetch;
      vi.unstubAllEnvs();
    }
  });

  it('syncs court dispatch player status transitions to PATCH /status when online and stays responsive offline', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://badminque-api.koyeb.app');
    const clubId = '55555555-5555-4555-8555-555555555551';

    await storageService.saveActiveSession({
      id: '55555555-5555-4555-8555-555555555552',
      club_id: clubId,
      club_name: 'Issue 33 Status Club',
      date: '2026-11-25',
      status: 'ACTIVE',
      created_at: '2026-11-25T10:00:00.000Z',
      sync_status: 'SYNCED',
    });

    for (let idx = 1; idx <= 4; idx += 1) {
      await storageService.savePlayer({
        id: `55555555-5555-4555-8555-55555555550${idx}`,
        club_id: clubId,
        name: `Status Player ${idx}`,
        auth_user_id: null,
        initial_tier: 'INTERMEDIATE',
        singles_rating: 1400,
        doubles_rating: 1400,
        singles_dubr: 3.5,
        doubles_dubr: 3.5,
        matches_played: 0,
        status: 'QUEUED',
        checked_in_at: `2026-11-25T10:0${idx}:00.000Z`,
      });
    }

    const patchCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH' && typeof init.body === 'string') {
        patchCalls.push({
          url,
          body: JSON.parse(init.body) as Record<string, unknown>,
        });
      }
      return { ok: true, json: async () => [] };
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      render(<CourtsideStationPage />);

      expect((await screen.findAllByText('Status Player 1', {}, { timeout: 3000 })).length).toBeGreaterThanOrEqual(1);

      const dispatchButtons = await screen.findAllByRole('button', { name: /⚡ Dispatch/i });
      await act(async () => {
        fireEvent.click(dispatchButtons[0] as HTMLElement);
      });

      await waitFor(() => {
        expect(
          patchCalls.some(
            (call) =>
              call.url ===
                `https://badminque-api.koyeb.app/api/v1/clubs/${clubId}/players/55555555-5555-4555-8555-555555555501/status` &&
              call.body.status === 'PLAYING'
          )
        ).toBe(true);
      });

      // Now switch offline and verify check-in + local persistence stays unblocked
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      const callsBeforeOffline = mockFetch.mock.calls.length;

      const input = screen.getByPlaceholderText(/Search roster or enter name/i);
      const addButton = screen.getByRole('button', { name: /Add Player/i });
      fireEvent.change(input, { target: { value: 'Offline Added Dan' } });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect((await screen.findAllByText('Offline Added Dan', {}, { timeout: 3000 })).length).toBeGreaterThanOrEqual(1);
      expect(mockFetch.mock.calls.length).toBe(callsBeforeOffline);
    } finally {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    }
  });
});

