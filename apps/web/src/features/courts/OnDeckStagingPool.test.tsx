import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnDeckMatchGroup, RosterPlayer } from '@badminque/core';
import { OnDeckStagingPool } from './OnDeckStagingPool';

function createPlayer(id: string, name: string, rating: number = 1500, dubr: number = 3.5): RosterPlayer {
  return {
    id,
    name,
    auth_user_id: null,
    singles_rating: rating,
    doubles_rating: rating,
    doubles_dubr: dubr,
    matches_played: 0,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00.000Z',
  };
}

describe('OnDeckStagingPool', () => {
  const mockGroups: OnDeckMatchGroup[] = [
    {
      slotIndex: 1,
      label: 'Next Up',
      pairA: [createPlayer('p1', 'Alice', 1600, 3.75), createPlayer('p2', 'Bob', 1580, 3.7)],
      pairB: [createPlayer('p3', 'Charlie', 1590, 3.72), createPlayer('p4', 'David', 1570, 3.68)],
      pairARating: 1588,
      pairBRating: 1578,
      spread: 10,
      policy: 'FAIR_PLAY',
    },
    {
      slotIndex: 2,
      label: 'Following',
      pairA: [createPlayer('p5', 'Eve', 1520, 3.55), createPlayer('p6', 'Frank', 1500, 3.5)],
      pairB: [createPlayer('p7', 'Grace', 1510, 3.52), createPlayer('p8', 'Heidi', 1490, 3.48)],
      pairARating: 1508,
      pairBRating: 1498,
      spread: 10,
      policy: 'FAIR_PLAY',
    },
  ];

  it('permanently displays two automated match groups pre-grouped into Pair A vs Pair B', () => {
    render(<OnDeckStagingPool onDeckGroups={mockGroups} />);

    // Slot 1: Next Up
    expect(screen.getByText('Next Up')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('David')).toBeInTheDocument();

    // Slot 2: Following
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('Eve')).toBeInTheDocument();
    expect(screen.getByText('Frank')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.getByText('Heidi')).toBeInTheDocument();

    // DUBR displays
    expect(screen.getAllByText(/DUBR:/i).length).toBeGreaterThanOrEqual(4);

    // Slot 3: Custom Staging placeholder is shown when slot 3 is empty
    expect(screen.getByText('#3 · Custom Staging (Organizer Slot)')).toBeInTheDocument();
    expect(screen.getByText(/Custom Match Staging/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /\+ Assemble Custom Match/i })
    ).toBeInTheDocument();
  });

  it('triggers onDispatchToCourt in 1 tap when dispatch button is tapped', () => {
    const handleDispatch = vi.fn();
    render(
      <OnDeckStagingPool
        onDeckGroups={mockGroups}
        onDispatchToCourt={handleDispatch}
      />
    );

    const dispatchButtons = screen.getAllByRole('button', { name: /Dispatch to Court/i });
    expect(dispatchButtons).toHaveLength(2);

    fireEvent.click(dispatchButtons[0] as HTMLElement);
    expect(handleDispatch).toHaveBeenCalledWith(1);

    fireEvent.click(dispatchButtons[1] as HTMLElement);
    expect(handleDispatch).toHaveBeenCalledWith(2);
  });

  it('renders Slot 3 custom staged card with Edit Pairs and Send C1/C2/C3 buttons', () => {
    const handleDispatch = vi.fn();
    const handleOpenCustom = vi.fn();

    const threeGroups: OnDeckMatchGroup[] = [
      ...mockGroups,
      {
        slotIndex: 3,
        label: 'In the Hole',
        pairA: [createPlayer('p9', 'Ian', 1650, 3.8), createPlayer('p10', 'Jack', 1620, 3.75)],
        pairB: [createPlayer('p11', 'Kelly', 1640, 3.78), createPlayer('p12', 'Leo', 1610, 3.72)],
        pairARating: 1635,
        pairBRating: 1625,
        spread: 10,
        policy: 'FAIR_PLAY',
      },
    ];

    render(
      <OnDeckStagingPool
        onDeckGroups={threeGroups}
        onDispatchToCourt={handleDispatch}
        onOpenCustomBuilder={handleOpenCustom}
      />
    );

    expect(screen.getByText('#3 · Custom Staging')).toBeInTheDocument();
    expect(screen.getByText('Ian')).toBeInTheDocument();

    // Edit Pairs button
    const editBtn = screen.getByRole('button', { name: /Edit Pairs/i });
    fireEvent.click(editBtn);
    expect(handleOpenCustom).toHaveBeenCalledWith(3);

    // Send C1, C2, C3 buttons
    const sendC1 = screen.getByRole('button', { name: /⚡ Send C1/i });
    const sendC2 = screen.getByRole('button', { name: /⚡ Send C2/i });
    const sendC3 = screen.getByRole('button', { name: /⚡ Send C3/i });

    expect(sendC1).toBeInTheDocument();
    expect(sendC2).toBeInTheDocument();
    expect(sendC3).toBeInTheDocument();

    fireEvent.click(sendC2);
    expect(handleDispatch).toHaveBeenCalledWith(3, 2);
  });
});
