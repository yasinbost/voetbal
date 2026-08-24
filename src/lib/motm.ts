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
