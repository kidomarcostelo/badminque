import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByText(/1 Players/i)).toBeInTheDocument();
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
      expect(await screen.findByText(name)).toBeInTheDocument();
    }

    // 1. Dispatch Court 1 from IDLE -> IN_MATCH
    const dispatchButtons = screen.getAllByRole('button', { name: /⚡ Dispatch/i });
    expect(dispatchButtons.length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      fireEvent.click(dispatchButtons[0]!);
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
});
