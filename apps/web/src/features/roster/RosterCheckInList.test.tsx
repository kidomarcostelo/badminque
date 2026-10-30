import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { storageService, closeDatabaseConnection } from '../../services/storageService';
import { RosterCheckInList } from './RosterCheckInList';

describe('RosterCheckInList', () => {
  beforeEach(async () => {
    closeDatabaseConnection();
    await storageService.clearAll();
  });

  it('renders empty roster state initially', async () => {
    render(<RosterCheckInList />);
    expect(
      screen.getByText(/No players checked in yet/i)
    ).toBeInTheDocument();
  });

  it('checks in a new player via 1-tap button and adds to active bench', async () => {
    render(<RosterCheckInList />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    fireEvent.change(input, { target: { value: 'Marcus Gideon' } });
    fireEvent.click(addButton);

    // Verifies player is immediately on the active bench roster table
    expect(await screen.findByText('Marcus Gideon')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('QUEUED')).toBeInTheDocument();

    // Input is cleared for rapid sequential check-ins (<2 seconds)
    expect(input).toHaveValue('');
  });

  it('shows typeahead suggestions to prevent duplicate profiles', async () => {
    render(<RosterCheckInList />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    // Add first player
    fireEvent.change(input, { target: { value: 'Kevin Sukamuljo' } });
    fireEvent.click(addButton);
    expect(await screen.findByText('Kevin Sukamuljo')).toBeInTheDocument();

    // Type prefix "Kev" -> Suggestion dropdown appears
    fireEvent.change(input, { target: { value: 'Kev' } });
    const suggestionItem = await screen.findByRole('button', {
      name: /Select existing player Kevin Sukamuljo/i,
    });
    expect(suggestionItem).toBeInTheDocument();

    // Clicking suggestion clears input and prevents duplicate creation
    fireEvent.click(suggestionItem);
    expect(input).toHaveValue('');
    const benchEntries = screen.getAllByText('Kevin Sukamuljo');
    // Only one entry on the bench
    expect(benchEntries).toHaveLength(1);
  });

  it('toggles player status from QUEUED to RESTING and back', async () => {
    render(<RosterCheckInList />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    fireEvent.change(input, { target: { value: 'Greysia Polii' } });
    fireEvent.click(addButton);

    expect(await screen.findByText('QUEUED')).toBeInTheDocument();

    // Toggle status
    const toggleButton = await screen.findByRole('button', {
      name: /Toggle status for Greysia Polii/i,
    });
    fireEvent.click(toggleButton);

    expect(await screen.findByText('RESTING')).toBeInTheDocument();
  });

  it('checks in a resting player when their suggestion is clicked', async () => {
    render(<RosterCheckInList />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    // 1. Check in player
    fireEvent.change(input, { target: { value: 'Apriyani Rahayu' } });
    fireEvent.click(addButton);
    expect(await screen.findByText('Apriyani Rahayu')).toBeInTheDocument();

    // 2. Put player to RESTING
    const toggleButton = await screen.findByRole('button', {
      name: /Toggle status for Apriyani Rahayu/i,
    });
    fireEvent.click(toggleButton);
    expect(await screen.findByText('RESTING')).toBeInTheDocument();

    // 3. Search "Apri" and click suggestion
    fireEvent.change(input, { target: { value: 'Apri' } });
    const suggestionItem = await screen.findByRole('button', {
      name: /Select existing player Apriyani Rahayu/i,
    });
    fireEvent.click(suggestionItem);

    // 4. Verifies player is re-checked in (QUEUED)
    expect(await screen.findByText('QUEUED')).toBeInTheDocument();
  });

  it('checks in a resting player when their exact name is re-submitted', async () => {
    render(<RosterCheckInList />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    // Check in player
    fireEvent.change(input, { target: { value: 'Jonatan Christie' } });
    fireEvent.click(addButton);
    expect(await screen.findByText('Jonatan Christie')).toBeInTheDocument();

    // Set to RESTING
    const toggleButton = await screen.findByRole('button', {
      name: /Toggle status for Jonatan Christie/i,
    });
    fireEvent.click(toggleButton);
    expect(await screen.findByText('RESTING')).toBeInTheDocument();

    // Type full name and click Add Player again
    fireEvent.change(input, { target: { value: 'Jonatan Christie' } });
    fireEvent.click(addButton);

    // Status returns to QUEUED without duplicate profile
    expect(await screen.findByText('QUEUED')).toBeInTheDocument();
    expect(screen.getAllByText('Jonatan Christie')).toHaveLength(1);
  });

  it('checks in unrated player with 1-tap tier anchor Beginner and displays 2.500 with Provisional badge', async () => {
    render(<RosterCheckInList />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });
    const beginnerPill = screen.getByRole('radio', { name: /Beginner/i });

    fireEvent.change(input, { target: { value: 'Beginner Ben' } });
    fireEvent.click(beginnerPill);
    fireEvent.click(addButton);

    expect(await screen.findByText('Beginner Ben')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('2.500')).toBeInTheDocument();
    expect(within(table).getByText('Provisional')).toBeInTheDocument();
  });

  it('checks in unrated player with default Intermediate tier anchor and displays 3.500 with Provisional badge', async () => {
    render(<RosterCheckInList />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    fireEvent.change(input, { target: { value: 'Intermediate Ian' } });
    // Default tier is Intermediate (3.500)
    fireEvent.click(addButton);

    expect(await screen.findByText('Intermediate Ian')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('3.500')).toBeInTheDocument();
    expect(within(table).getByText('Provisional')).toBeInTheDocument();
  });

  it('checks in unrated player with 1-tap tier anchor Advanced and displays 4.500 with Provisional badge', async () => {
    render(<RosterCheckInList />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });
    const advancedPill = screen.getByRole('radio', { name: /Advanced/i });

    fireEvent.change(input, { target: { value: 'Advanced Alice' } });
    fireEvent.click(advancedPill);
    fireEvent.click(addButton);

    expect(await screen.findByText('Advanced Alice')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('4.500')).toBeInTheDocument();
    expect(within(table).getByText('Provisional')).toBeInTheDocument();
  });

  it('does not display Provisional badge when player has reached 8 matches', async () => {
    await storageService.savePlayer({
      id: 'established-player-id',
      name: 'Established Eric',
      auth_user_id: null,
      singles_rating: 1800.0,
      doubles_rating: 1800.0,
      doubles_dubr: 4.500,
      singles_dubr: 4.500,
      matches_played: 8,
      status: 'QUEUED',
      checked_in_at: new Date().toISOString(),
    });

    render(<RosterCheckInList />);

    expect(await screen.findByText('Established Eric')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('4.500')).toBeInTheDocument();
    expect(within(table).queryByText('Provisional')).not.toBeInTheDocument();
  });

  it('checks in a player with tier anchor via the check-in modal', async () => {
    render(<RosterCheckInList />);

    const openModalBtn = screen.getByRole('button', {
      name: /Open detailed check-in modal/i,
    });
    fireEvent.click(openModalBtn);

    // Modal dialog is displayed
    expect(await screen.findByText('Check In Roster Player')).toBeInTheDocument();

    const modalNameInput = screen.getByLabelText(/Player Name/i);
    fireEvent.change(modalNameInput, { target: { value: 'Modal Mike' } });

    // Select Advanced tier inside modal
    const advancedPills = screen.getAllByRole('radio', { name: /Advanced/i });
    const modalAdvancedPill = advancedPills[advancedPills.length - 1];
    if (modalAdvancedPill) {
      fireEvent.click(modalAdvancedPill);
    }

    const checkInSubmitBtn = screen.getByRole('button', {
      name: /Check In Player/i,
    });
    fireEvent.click(checkInSubmitBtn);

    // Verifies player is added to bench roster with 4.500 DUBR and Provisional badge
    expect(await screen.findByText('Modal Mike')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('4.500')).toBeInTheDocument();
    expect(within(table).getByText('Provisional')).toBeInTheDocument();
  });
});

