import React, { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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
});

