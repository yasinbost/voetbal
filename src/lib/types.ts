export type MatchResult = 'win' | 'lose' | 'draw';

export interface Player {
  id: string;
  name: string;
  createdAt: number;
}

export interface MatchEntry {
  playerId: string;
  result: MatchResult;
}

export interface Match {
  id: string;
  /** ISO tarih: "2026-08-23" */
  date: string;
  entries: MatchEntry[];
  createdAt: number;
}

export interface PlayerStats {
  playerId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  /** Maç başına ortalama puan (played === 0 ise 0) */
  average: number;
  /** Katılım oranı 0..1 (oynadığı maç / toplam düzenlenen maç) */
  attendance: number;
  totalMatches: number;
}

export const POINTS: Record<MatchResult, number> = {
  win: 2,
  draw: 1,
  lose: 0,
};

/** Maça katılan herkes sonuçtan bağımsız olarak bunu da alır. */
export const PARTICIPATION_POINT = 1;
