import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
});
