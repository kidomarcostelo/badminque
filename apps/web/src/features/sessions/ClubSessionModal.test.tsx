import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClubNightSession } from '@badminque/core';
import { ClubSessionModal } from './ClubSessionModal';

describe('ClubSessionModal', () => {
  const activeSession: ClubNightSession = {
    id: 'night-uuid-1',
    club_id: 'club-uuid-1',
    club_name: 'Shuttle House',
    date: '2026-11-25',
    status: 'ACTIVE',
    created_at: '2026-11-25T10:00:00Z',
    sync_status: 'SYNCED',
  };

  const savedSessions: ClubNightSession[] = [
    activeSession,
    {
      id: 'night-uuid-2',
      club_id: 'club-uuid-2',
      club_name: 'Harborview Club',
      date: '2026-11-24',
      status: 'ACTIVE',
      created_at: '2026-11-24T10:00:00Z',
      sync_status: 'PENDING',
    },
  ];

  it('allows switching between saved Club Night sessions', () => {
    const onSelect = vi.fn();
    render(
      <ClubSessionModal
        isOpen={true}
        activeSession={activeSession}
        sessions={savedSessions}
        onSelectSession={onSelect}
        onCreateSession={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const harborBtn = screen.getByRole('button', { name: /Harborview Club/i });
    fireEvent.click(harborBtn);
    expect(onSelect).toHaveBeenCalledWith(savedSessions[1]);
  });

  it('creates a new Club and Club Night session with form input', () => {
    const onCreate = vi.fn();
    render(
      <ClubSessionModal
        isOpen={true}
        activeSession={activeSession}
        sessions={savedSessions}
        onSelectSession={vi.fn()}
        onCreateSession={onCreate}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Club Name/i), {
      target: { value: 'Weekend Ralliers' },
    });
    fireEvent.change(screen.getByLabelText(/Session Date/i), {
      target: { value: '2026-11-28' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Start Club Night/i }));
    expect(onCreate).toHaveBeenCalledWith({
      clubName: 'Weekend Ralliers',
      date: '2026-11-28',
    });
  });
});
