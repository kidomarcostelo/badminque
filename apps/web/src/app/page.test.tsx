import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import CourtsideStationPage from './page';
import { storageService, closeDatabaseConnection } from '../services/storageService';

describe('CourtsideStationPage', () => {
  beforeEach(async () => {
    closeDatabaseConnection();
    await storageService.clearAll();
  });

  it('renders courtside station header, courts grid, and check-in section', async () => {
    render(<CourtsideStationPage />);

    expect(
      screen.getByText('Badminque Courtside Station')
    ).toBeInTheDocument();
    expect(screen.getByText('Court 1')).toBeInTheDocument();
    expect(screen.getByText('Court 2')).toBeInTheDocument();
    expect(screen.getByText('Court 3')).toBeInTheDocument();
    expect(
      screen.getByText('Courtside Check-In & Roster')
    ).toBeInTheDocument();
  });

  it('allows organizer to check in a player directly on courtside station', async () => {
    render(<CourtsideStationPage />);

    const input = screen.getByPlaceholderText(/Search roster or enter name/i);
    const addButton = screen.getByRole('button', { name: /Add Player/i });

    fireEvent.change(input, { target: { value: 'Anthony Ginting' } });
    fireEvent.click(addButton);

    expect(await screen.findByText('Anthony Ginting')).toBeInTheDocument();
  });
});
