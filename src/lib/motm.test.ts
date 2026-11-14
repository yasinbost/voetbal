import { describe, expect, it } from 'vitest';
import { pollResultRows } from './motm';
import type { VoteTally } from './types';

const candidates = [
  { id: 'a', name: 'Ali' },
  { id: 'b', name: 'Burak' },
  { id: 'c', name: 'Cem' },
];

const tally = (playerId: string, votes: number): VoteTally => ({ matchId: 'm1', playerId, votes });

describe('pollResultRows', () => {
  it('sorts rows by votes descending and computes shares', () => {
    const { rows, total } = pollResultRows(candidates, [tally('a', 1), tally('c', 3)]);

    expect(total).toBe(4);
    expect(rows.map((r) => [r.id, r.votes, r.share])).toEqual([
      ['c', 3, 75],
      ['a', 1, 25],
      ['b', 0, 0],
    ]);
    expect(rows.map((r) => r.leading)).toEqual([true, false, false]);
  });

  it('marks every tied top candidate as leading', () => {
    const { rows } = pollResultRows(candidates, [tally('a', 2), tally('b', 2), tally('c', 1)]);

    expect(rows.filter((r) => r.leading).map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('has zero total and no leader when nobody voted', () => {
    const { rows, total } = pollResultRows(candidates, []);

    expect(total).toBe(0);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.votes === 0 && r.share === 0 && !r.leading)).toBe(true);
  });

  it('sums multiple tallies for the same player', () => {
    const { rows, total } = pollResultRows(candidates, [tally('b', 2), tally('b', 1), tally('a', 2)]);

    expect(total).toBe(5);
    expect(rows[0]).toMatchObject({ id: 'b', votes: 3, share: 60, leading: true });
  });

  it('ignores votes for players no longer in the match', () => {
    const { rows, total } = pollResultRows(candidates, [tally('a', 1), tally('removed', 5)]);

    expect(total).toBe(1);
    expect(rows.map((r) => r.id)).not.toContain('removed');
    expect(rows[0]).toMatchObject({ id: 'a', share: 100, leading: true });
  });
});
