import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RosterCheckInModal } from './RosterCheckInModal';

describe('RosterCheckInModal', () => {
  it('renders modal when open and submits with default intermediate tier', async () => {
    const handleCheckIn = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <RosterCheckInModal
        isOpen={true}
        onClose={handleClose}
        onCheckIn={handleCheckIn}
      />
    );

    expect(screen.getByText('Check In Roster Player')).toBeInTheDocument();

    const input = screen.getByLabelText(/Player Name/i);
    fireEvent.change(input, { target: { value: 'Anthony Ginting' } });

    const submitBtn = screen.getByRole('button', { name: /Check In Player/i });
    fireEvent.click(submitBtn);

    expect(handleCheckIn).toHaveBeenCalledWith('Anthony Ginting', 'INTERMEDIATE');
  });

  it('allows 1-tap tier anchor selection in modal before submitting', async () => {
    const handleCheckIn = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <RosterCheckInModal
        isOpen={true}
        onClose={handleClose}
        onCheckIn={handleCheckIn}
      />
    );

    const input = screen.getByLabelText(/Player Name/i);
    fireEvent.change(input, { target: { value: 'Beginner Bob' } });

    const beginnerPill = screen.getByRole('radio', { name: /Beginner/i });
    fireEvent.click(beginnerPill);

    const submitBtn = screen.getByRole('button', { name: /Check In Player/i });
    fireEvent.click(submitBtn);

    expect(handleCheckIn).toHaveBeenCalledWith('Beginner Bob', 'BEGINNER');
  });

  it('closes on cancel button click', () => {
    const handleCheckIn = vi.fn();
    const handleClose = vi.fn();

    render(
      <RosterCheckInModal
        isOpen={true}
        onClose={handleClose}
        onCheckIn={handleCheckIn}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
