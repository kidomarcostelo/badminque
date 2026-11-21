import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SyncStatusIndicator } from './SyncStatusIndicator';

describe('SyncStatusIndicator', () => {
  it('renders Online (Synced) when online with 0 pending matches', () => {
    render(
      <SyncStatusIndicator
        isOnline={true}
        isSyncing={false}
        pendingCount={0}
        syncError={null}
        onSyncNow={vi.fn()}
      />
    );

    expect(screen.getByText('Online (Synced)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
  });

  it('renders Offline badge with pending count when disconnected', () => {
    render(
      <SyncStatusIndicator
        isOnline={false}
        isSyncing={false}
        pendingCount={3}
        syncError={null}
        onSyncNow={vi.fn()}
      />
    );

    expect(screen.getByText('Offline (3 Pending)')).toBeInTheDocument();
  });

  it('renders Syncing... spinner when sync is in flight', () => {
    render(
      <SyncStatusIndicator
        isOnline={true}
        isSyncing={true}
        pendingCount={2}
        syncError={null}
        onSyncNow={vi.fn()}
      />
    );

    expect(screen.getByText('Syncing...')).toBeInTheDocument();
  });

  it('displays Sync Now button and triggers onSyncNow when clicked', () => {
    const handleSync = vi.fn();
    render(
      <SyncStatusIndicator
        isOnline={true}
        isSyncing={false}
        pendingCount={2}
        syncError={null}
        onSyncNow={handleSync}
      />
    );

    expect(screen.getByText('Online (2 Pending)')).toBeInTheDocument();
    const syncButton = screen.getByRole('button', { name: /sync now/i });
    expect(syncButton).toBeInTheDocument();

    fireEvent.click(syncButton);
    expect(handleSync).toHaveBeenCalledTimes(1);
  });

  it('renders error indicator when syncError is provided', () => {
    render(
      <SyncStatusIndicator
        isOnline={true}
        isSyncing={false}
        pendingCount={1}
        syncError="Server unreachable (503)"
        onSyncNow={vi.fn()}
      />
    );

    expect(screen.getByText(/server unreachable/i)).toBeInTheDocument();
  });
});
