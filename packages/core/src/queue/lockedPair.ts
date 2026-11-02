import type { RosterPlayer } from '../types';

/**
 * Pins two players as a locked tournament/custom pair.
 * Strictly enforces the Locked Pair Invariant:
 * 1. Queue arrival is anchored to the later partner's readiness:
 *    t_ready(pair) = max(t_ready(A), t_ready(B))
 * 2. Match count is anchored to higher count:
 *    M(pair) = max(M_A, M_B)
 * 3. If one partner is currently PLAYING or RESTING, the waiting partner enters WAITING_PARTNER.
 */
export function pinPlayerPair(
  playerA: RosterPlayer,
  playerB: RosterPlayer
): [RosterPlayer, RosterPlayer] {
  const timeA = Date.parse(playerA.checked_in_at) || 0;
  const timeB = Date.parse(playerB.checked_in_at) || 0;
  const anchoredTime = new Date(Math.max(timeA, timeB)).toISOString();
  const maxMatches = Math.max(playerA.matches_played, playerB.matches_played);

  let statusA = playerA.status;
  let statusB = playerB.status;

  if (playerA.status === 'PLAYING' && playerB.status !== 'PLAYING') {
    statusB = 'WAITING_PARTNER';
  } else if (playerB.status === 'PLAYING' && playerA.status !== 'PLAYING') {
    statusA = 'WAITING_PARTNER';
  } else if (playerA.status === 'RESTING' && playerB.status === 'QUEUED') {
    statusB = 'WAITING_PARTNER';
  } else if (playerB.status === 'RESTING' && playerA.status === 'QUEUED') {
    statusA = 'WAITING_PARTNER';
  }

  const updatedA: RosterPlayer = {
    ...playerA,
    locked_partner_id: playerB.id,
    locked_partner_name: playerB.name,
    checked_in_at: anchoredTime,
    matches_played: maxMatches,
    status: statusA,
  };

  const updatedB: RosterPlayer = {
    ...playerB,
    locked_partner_id: playerA.id,
    locked_partner_name: playerA.name,
    checked_in_at: anchoredTime,
    matches_played: maxMatches,
    status: statusB,
  };

  return [updatedA, updatedB];
}

/**
 * Dissolves a locked partnership and immediately restores both players to individual rotation.
 */
export function unpinPlayerPair(
  playerA: RosterPlayer,
  partnerB?: RosterPlayer
): [RosterPlayer, RosterPlayer | null] {
  const updatedA: RosterPlayer = {
    ...playerA,
    locked_partner_id: null,
    locked_partner_name: null,
    status: playerA.status === 'WAITING_PARTNER' ? 'QUEUED' : playerA.status,
  };

  if (!partnerB) {
    return [updatedA, null];
  }

  const updatedB: RosterPlayer = {
    ...partnerB,
    locked_partner_id: null,
    locked_partner_name: null,
    status: partnerB.status === 'WAITING_PARTNER' ? 'QUEUED' : partnerB.status,
  };

  return [updatedA, updatedB];
}

/**
 * Reconciles a player's WAITING_PARTNER status based on their locked partner's state.
 */
export function reconcileLockedPairStatus(
  player: RosterPlayer,
  allPlayers: readonly RosterPlayer[]
): RosterPlayer {
  if (!player.locked_partner_id) {
    if (player.status === 'WAITING_PARTNER') {
      return { ...player, status: 'QUEUED' };
    }
    return player;
  }

  const partner = allPlayers.find((p) => p.id === player.locked_partner_id);
  if (!partner) {
    // Partner disappeared or not found; revert to individual
    return {
      ...player,
      locked_partner_id: null,
      locked_partner_name: null,
      status: player.status === 'WAITING_PARTNER' ? 'QUEUED' : player.status,
    };
  }

  // If partner is on court or resting, this player must wait
  if (partner.status === 'PLAYING' || partner.status === 'RESTING') {
    if (player.status === 'QUEUED' || player.status === 'SKIPPED') {
      return { ...player, status: 'WAITING_PARTNER' };
    }
    return player;
  }

  // If partner is also ready (QUEUED or SKIPPED), player is ready
  if (partner.status === 'QUEUED' || partner.status === 'SKIPPED') {
    if (player.status === 'WAITING_PARTNER') {
      return { ...player, status: 'QUEUED' };
    }
  }

  return player;
}

/**
 * Toggles a 1-match skip breather with elevated priority boost.
 */
export function togglePlayerSkip(player: RosterPlayer): RosterPlayer {
  const nextSkipped = !player.is_skipped;
  let nextStatus = player.status;

  if (nextSkipped) {
    if (player.status === 'QUEUED') {
      nextStatus = 'SKIPPED';
    }
  } else {
    if (player.status === 'SKIPPED') {
      nextStatus = 'QUEUED';
    }
  }

  return {
    ...player,
    is_skipped: nextSkipped,
    status: nextStatus,
  };
}
