import 'server-only';
import { randomUUID } from 'node:crypto';
import { Pool, type QueryResultRow } from 'pg';
import { type Match, type MatchEntry, type Player } from './types';

/**
 * Veri katmanı.
 *
 * Vercel Supabase entegrasyonu `POSTGRES_URL` sağladığında Supabase Postgres
 * kullanılır. Local geliştirmede env yoksa `data/local-db.json` dosyasına düşer.
 */

const hasPostgres = Boolean(process.env.POSTGRES_URL);

export const usingPostgres = hasPostgres;

declare global {
  // eslint-disable-next-line no-var
  var voetbalPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var voetbalSchemaReady: Promise<void> | undefined;
}

interface PlayerRow {
  id: string;
  name: string;
  created_at: string | number;
}

interface MatchRow {
  id: string;
  date: string;
  entries: MatchEntry[] | string;
  created_at: string | number;
}

function pool(): Pool {
  if (!process.env.POSTGRES_URL) throw new Error('POSTGRES_URL tanımlı değil.');

  globalThis.voetbalPool ??= new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  return globalThis.voetbalPool;
}

async function ensureSchema(): Promise<void> {
  if (!hasPostgres) return;

  globalThis.voetbalSchemaReady ??= pool().query(`
    create table if not exists players (
      id uuid primary key,
      name text not null,
      created_at bigint not null
    );

    create table if not exists matches (
      id uuid primary key,
      date text not null,
      entries jsonb not null,
      created_at bigint not null
    );
  `).then(() => undefined);

  await globalThis.voetbalSchemaReady;
}

async function query<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const result = await pool().query<T>(text, values);
  return result.rows;
}

function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    createdAt: Number(row.created_at),
  };
}

function toEntries(value: MatchRow['entries']): MatchEntry[] {
  return typeof value === 'string' ? (JSON.parse(value) as MatchEntry[]) : value;
}

function toMatch(row: MatchRow): Match {
  return {
    id: row.id,
    date: row.date,
    entries: toEntries(row.entries),
    createdAt: Number(row.created_at),
  };
}

/* ------------------------------------------------------------------ */
/* Yerel JSON                                                          */
/* ------------------------------------------------------------------ */

interface LocalDb {
  players: Player[];
  matches: Match[];
}

const LOCAL_FILE = 'data/local-db.json';

async function readLocal(): Promise<LocalDb> {
  const { readFile } = await import('node:fs/promises');
  try {
    const raw = await readFile(LOCAL_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    return {
      players: parsed.players ?? [],
      matches: parsed.matches ?? [],
    };
  } catch {
    return { players: [], matches: [] };
  }
}

async function writeLocal(db: LocalDb): Promise<void> {
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir('data', { recursive: true });
  await writeFile(LOCAL_FILE, JSON.stringify(db, null, 2), 'utf8');
}

/* ------------------------------------------------------------------ */
/* Oyuncular                                                           */
/* ------------------------------------------------------------------ */

export async function getPlayers(): Promise<Player[]> {
  if (hasPostgres) {
    const rows = await query<PlayerRow>('select id, name, created_at from players order by name');
    return rows.map(toPlayer).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }

  const db = await readLocal();
  return [...db.players].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export async function createPlayer(name: string): Promise<Player> {
  const player: Player = { id: randomUUID(), name, createdAt: Date.now() };
  if (hasPostgres) {
    await query(
      'insert into players (id, name, created_at) values ($1, $2, $3)',
      [player.id, player.name, player.createdAt],
    );
    return player;
  }

  const db = await readLocal();
  db.players.push(player);
  await writeLocal(db);
  return player;
}

export async function renamePlayer(id: string, name: string): Promise<void> {
  if (hasPostgres) {
    await query('update players set name = $2 where id = $1', [id, name]);
    return;
  }

  const db = await readLocal();
  const player = db.players.find((p) => p.id === id);
  if (player) player.name = name;
  await writeLocal(db);
}

export async function deletePlayer(id: string): Promise<void> {
  if (hasPostgres) {
    await query('delete from players where id = $1', [id]);
    return;
  }

  const db = await readLocal();
  db.players = db.players.filter((p) => p.id !== id);
  await writeLocal(db);
}

/* ------------------------------------------------------------------ */
/* Maclar                                                              */
/* ------------------------------------------------------------------ */

export async function getMatches(): Promise<Match[]> {
  if (hasPostgres) {
    const rows = await query<MatchRow>(
      'select id, date, entries, created_at from matches order by date desc, created_at desc',
    );
    return rows.map(toMatch);
  }

  const db = await readLocal();
  return [...db.matches].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export async function getMatch(id: string): Promise<Match | null> {
  if (hasPostgres) {
    const rows = await query<MatchRow>(
      'select id, date, entries, created_at from matches where id = $1 limit 1',
      [id],
    );
    return rows[0] ? toMatch(rows[0]) : null;
  }

  const db = await readLocal();
  return db.matches.find((m) => m.id === id) ?? null;
}

export async function createMatch(date: string, entries: MatchEntry[]): Promise<Match> {
  const match: Match = { id: randomUUID(), date, entries, createdAt: Date.now() };
  if (hasPostgres) {
    await query(
      'insert into matches (id, date, entries, created_at) values ($1, $2, $3::jsonb, $4)',
      [match.id, match.date, JSON.stringify(match.entries), match.createdAt],
    );
    return match;
  }

  const db = await readLocal();
  db.matches.push(match);
  await writeLocal(db);
  return match;
}

export async function updateMatch(id: string, date: string, entries: MatchEntry[]): Promise<void> {
  if (hasPostgres) {
    await query('update matches set date = $2, entries = $3::jsonb where id = $1', [
      id,
      date,
      JSON.stringify(entries),
    ]);
    return;
  }

  const db = await readLocal();
  const match = db.matches.find((m) => m.id === id);
  if (match) {
    match.date = date;
    match.entries = entries;
  }
  await writeLocal(db);
}

export async function deleteMatch(id: string): Promise<void> {
  if (hasPostgres) {
    await query('delete from matches where id = $1', [id]);
    return;
  }

  const db = await readLocal();
  db.matches = db.matches.filter((m) => m.id !== id);
  await writeLocal(db);
}
