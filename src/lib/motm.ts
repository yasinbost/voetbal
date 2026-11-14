import { POLL_WINDOW_MS, type Match, type VoteTally } from './types';

/**
 * Maçın adamı anketi.
 *
 * Anket maç **kaydedildiği** an açılır ve `POLL_WINDOW_MS` sonra kapanır; maçın
 * tarihi değil, kaydın `createdAt` değeri esas alınır. Kazanan yalnızca anket
 * kapandıktan sonra kesinleşir, puan da o zaman işlenir.
 */

export function pollClosesAt(match: Match): number {
  return match.createdAt + POLL_WINDOW_MS;
}

export function isPollOpen(match: Match, now: number): boolean {
  return now < pollClosesAt(match);
}

/** Maçta oynayan oyuncuların id'leri. */
function participantIds(match: Match): Set<string> {
  return new Set(match.entries.map((e) => e.playerId));
}

/**
 * Bir maçın kazananları. Eşitlikte en yüksek oyu alanların **hepsi** kazanır.
 * Maç sonradan düzenlenip biri çıkarıldıysa ona gelen oylar sayılmaz.
 */
export function winnersOf(match: Match, tallies: VoteTally[]): string[] {
  const participants = participantIds(match);
  const valid = tallies.filter((t) => t.matchId === match.id && participants.has(t.playerId));
  if (valid.length === 0) return [];

  const top = Math.max(...valid.map((t) => t.votes));
  if (top <= 0) return [];

  return valid.filter((t) => t.votes === top).map((t) => t.playerId);
}

/** Yalnızca anketi kapanmış maçlar için kazananlar; puan hesabı bunu kullanır. */
export function motmWinnersByMatch(
  matches: Match[],
  tallies: VoteTally[],
  now: number,
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const match of matches) {
    if (isPollOpen(match, now)) continue;
    const winners = winnersOf(match, tallies);
    if (winners.length > 0) result.set(match.id, winners);
  }

  return result;
}

/** Anketi açık olan maç, en son **kaydedilen** maçtır (maç tarihi değil). */
export function latestMatch(matches: Match[]): Match | undefined {
  return matches.reduce<Match | undefined>(
    (latest, match) => (!latest || match.createdAt > latest.createdAt ? match : latest),
    undefined,
  );
}

export interface PollCandidate {
  id: string;
  name: string;
}

export interface PollResultRow extends PollCandidate {
  votes: number;
  /** Toplam içindeki yüzde payı, tam sayıya yuvarlanmış. */
  share: number;
  /** En yüksek oyu alan(lar); eşitlikte hepsi. Hiç oy yoksa kimse. */
  leading: boolean;
}

/**
 * Oy dağılımı tablosu. Yalnızca aday (maça çıkan) oyuncuların oyları sayılır;
 * maçtan sonradan çıkarılan oyuncuya gelen oy toplama da girmez (`winnersOf` ile tutarlı).
 */
export function pollResultRows(
  candidates: PollCandidate[],
  tallies: VoteTally[],
): { rows: PollResultRow[]; total: number } {
  const counts = new Map<string, number>();
  for (const t of tallies) counts.set(t.playerId, (counts.get(t.playerId) ?? 0) + t.votes);

  const withVotes = candidates.map((c) => ({ ...c, votes: counts.get(c.id) ?? 0 }));
  const total = withVotes.reduce((sum, c) => sum + c.votes, 0);
  const top = Math.max(0, ...withVotes.map((c) => c.votes));

  const rows = withVotes
    .map((c) => ({
      ...c,
      share: total > 0 ? Math.round((c.votes / total) * 100) : 0,
      leading: c.votes > 0 && c.votes === top,
    }))
    .sort((a, b) => b.votes - a.votes);

  return { rows, total };
}
