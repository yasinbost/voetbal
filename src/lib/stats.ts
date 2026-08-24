import {
  MOTM_POINT,
  PARTICIPATION_POINT,
  POINTS,
  type Match,
  type Player,
  type PlayerStats,
} from './types';

/**
 * Tüm istatistikler maç kayıtlarından anında hesaplanır; hiçbir yerde
 * ayrıca saklanmaz. Böylece maç silinince/düzenlenince tablo kendiliğinden
 * doğru kalır.
 *
 * Puanlama: maça katılan herkes sonuçtan bağımsız +1 alır, üstüne sonuç
 * puanı eklenir. Net karşılık: galibiyet 3, beraberlik 2, mağlubiyet 1.
 *
 * `motmWinners` verilirse (anketi kapanmış maçların kazananları) her kazanana
 * ayrıca maçın adamı puanı eklenir. Anketi açık maçlar buraya girmediği için
 * oylama sürerken tablo oynamaz.
 */
export function computeStats(
  players: Player[],
  matches: Match[],
  motmWinners?: ReadonlyMap<string, string[]>,
): PlayerStats[] {
  const totalMatches = matches.length;

  const stats = new Map<string, PlayerStats>(
    players.map((p) => [
      p.id,
      {
        playerId: p.id,
        name: p.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        average: 0,
        attendance: 0,
        totalMatches,
      },
    ]),
  );

  for (const match of matches) {
    for (const entry of match.entries) {
      const s = stats.get(entry.playerId);
      if (!s) continue; // silinmiş oyuncu
      s.played += 1;
      s.points += PARTICIPATION_POINT + POINTS[entry.result];
      if (entry.result === 'win') s.wins += 1;
      else if (entry.result === 'draw') s.draws += 1;
      else s.losses += 1;
    }

    for (const winnerId of motmWinners?.get(match.id) ?? []) {
      const s = stats.get(winnerId);
      if (s) s.points += MOTM_POINT;
    }
  }

  for (const s of stats.values()) {
    s.average = s.played > 0 ? s.points / s.played : 0;
    s.attendance = totalMatches > 0 ? s.played / totalMatches : 0;
  }

  return [...stats.values()];
}

/** Toplam puana göre; eşitlikte galibiyet, sonra ad. */
export function sortByPoints(stats: PlayerStats[]): PlayerStats[] {
  return [...stats].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.played - a.played ||
      a.name.localeCompare(b.name, 'tr'),
  );
}

/** Maç başına ortalama puana göre; eşitlikte oynanan maç, sonra ad. */
export function sortByAverage(stats: PlayerStats[]): PlayerStats[] {
  return [...stats].sort(
    (a, b) => b.average - a.average || b.played - a.played || a.name.localeCompare(b.name, 'tr'),
  );
}

export function formatAverage(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function formatAttendance(s: PlayerStats): string {
  if (s.totalMatches === 0) return '-';
  return `${s.played}/${s.totalMatches} • %${Math.round(s.attendance * 100)}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}
