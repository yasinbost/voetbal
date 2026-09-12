import { describe, expect, it } from 'vitest';
import { computeStats, sortByPoints } from './stats';
import type { Match, Player } from './types';

/**
 * Starter/smoke test proving the Vitest harness is wired up correctly.
 * Full business-rule coverage (see docs/testing.md's "What must be tested" list)
 * is tracked as a follow-up spec, not written here.
 */
describe('computeStats', () => {
  const players: Player[] = [
    { id: 'a', name: 'Ali', createdAt: 0 },
    { id: 'b', name: 'Beren', createdAt: 0 },
  ];

  const matches: Match[] = [
    {
      id: 'm1',
      date: '2026-01-01',
      createdAt: 0,
      entries: [
        { playerId: 'a', result: 'win' },
        { playerId: 'b', result: 'lose' },
      ],
    },
  ];

  it('awards participation + result points (BR-1, BR-2)', () => {
    const stats = computeStats(players, matches);
    const ali = stats.find((s) => s.playerId === 'a');
    const beren = stats.find((s) => s.playerId === 'b');

    expect(ali?.points).toBe(2); // participation +1, win +1
    expect(beren?.points).toBe(1); // participation +1, lose +0
  });

  it('sorts by points, then wins, then name', () => {
    const sorted = sortByPoints(computeStats(players, matches));
    expect(sorted.map((s) => s.playerId)).toEqual(['a', 'b']);
  });
});
