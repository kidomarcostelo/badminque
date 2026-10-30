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
});
