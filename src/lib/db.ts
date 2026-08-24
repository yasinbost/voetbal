import 'server-only';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { Pool, type QueryResultRow } from 'pg';
import { type Match, type MatchEntry, type Player, type Vote, type VoteTally } from './types';

/**
 * Veri katmanı.
 *
 * Bağlantı dizesi env'de varsa Postgres kullanılır. Supabase / Neon / Vercel
 * Postgres entegrasyonları değişkene farklı isimler verebildiği için hepsine
 * bakıyoruz. Local geliştirmede hiçbiri yoksa `data/local-db.json` dosyasına
 * düşer; Vercel'de dosya sistemi salt okunur olduğu için orada sessizce
 * fallback'e düşmek yerine açık hata veriyoruz.
 */

/**
 * Barındırma entegrasyonlarının kullandığı bağlantı env isimleri, öncelik sırasıyla.
 * Neon/Supabase entegrasyonu bir önek seçildiğinde bu isimleri `Voetball_POSTGRES_URL`
 * gibi öneklendirdiği için son ekten de eşleştiriyoruz.
 */
const CONNECTION_ENV_KEYS = [
  'POSTGRES_URL',
  'DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_PRISMA_URL',
  'SUPABASE_DB_URL',
] as const;

/** Boş ya da yer tutucu değerleri elemek için: gerçek bir Postgres URL'i mi? */
function isPostgresUrl(value: string | undefined): value is string {
  if (!value) return false;
  return /^postgres(ql)?:\/\/[^\s]+$/i.test(value.trim());
}

/**
 * Env runtime'da okunur; modül yüklenirken sabitlenmez.
 * Önce tam isim eşleşmesi, sonra öneklendirilmiş varyantlar denenir.
 */
function connectionUrl(): string | undefined {
  for (const key of CONNECTION_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (isPostgresUrl(value)) return value;
  }

  for (const suffix of CONNECTION_ENV_KEYS) {
    for (const [key, raw] of Object.entries(process.env)) {
      if (!key.endsWith(suffix)) continue;
      const value = raw?.trim();
      if (isPostgresUrl(value)) return value;
    }
  }

  return undefined;
}

function hasPostgres(): boolean {
  return Boolean(connectionUrl());
}

export function usingPostgres(): boolean {
  return hasPostgres();
}

function missingDbMessage(): string {
  return (
    'Geçerli bir Postgres bağlantısı bulunamadı. Vercel → Settings → Environment Variables ' +
    `altında şu isimlerden biri (ya da önekli hali) postgres:// ile başlayan bir değer ` +
    `içermeli: ${CONNECTION_ENV_KEYS.join(', ')}. ` +
    'Değişkeni düzelttikten sonra projeyi yeniden deploy et.'
  );
}

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

interface TallyRow {
  match_id: string;
  player_id: string;
  votes: string | number;
}

function pool(): Pool {
  const url = connectionUrl();
  if (!url) throw new Error(missingDbMessage());

  globalThis.voetbalPool ??= new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  return globalThis.voetbalPool;
}

async function ensureSchema(): Promise<void> {
  if (!hasPostgres()) return;

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

    create table if not exists votes (
      match_id uuid not null,
      voter_id text not null,
      player_id uuid not null,
      created_at bigint not null,
      primary key (match_id, voter_id)
    );
  `).then(() => undefined);

  await globalThis.voetbalSchemaReady;
}

async function query<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const result = await pool().query<T>(text, values);
  return result.rows;
}

/** Satır döndürmeyen sorgular için; etkilenen satır sayısını verir. */
async function execute(text: string, values: unknown[] = []): Promise<number> {
  await ensureSchema();
  const result = await pool().query(text, values);
  return result.rowCount ?? 0;
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

function toTally(row: TallyRow): VoteTally {
  return {
    matchId: row.match_id,
    playerId: row.player_id,
    votes: Number(row.votes),
  };
}

/** Yerel JSON tarafında oyları maç/oyuncu bazında sayar. */
function tallyVotes(votes: Vote[]): VoteTally[] {
  const counts = new Map<string, VoteTally>();

  for (const vote of votes) {
    const key = `${vote.matchId}::${vote.playerId}`;
    const current = counts.get(key);
    if (current) current.votes += 1;
    else counts.set(key, { matchId: vote.matchId, playerId: vote.playerId, votes: 1 });
  }

  return [...counts.values()];
}

/* ------------------------------------------------------------------ */
/* Yerel JSON                                                          */
/* ------------------------------------------------------------------ */

interface LocalDb {
  players: Player[];
  matches: Match[];
  votes: Vote[];
}

const LOCAL_FILE = join(process.cwd(), 'data', 'local-db.json');

/** Vercel/Lambda'da dosya sistemi salt okunur — JSON fallback orada geçersiz. */
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function assertLocalAllowed(): void {
  if (isServerless) throw new Error(missingDbMessage());
}

async function readLocal(): Promise<LocalDb> {
  assertLocalAllowed();
  const { readFile } = await import('node:fs/promises');
  try {
    const raw = await readFile(LOCAL_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    return {
      players: parsed.players ?? [],
      matches: parsed.matches ?? [],
      votes: parsed.votes ?? [],
    };
  } catch {
    return { players: [], matches: [], votes: [] };
  }
}

async function writeLocal(db: LocalDb): Promise<void> {
  assertLocalAllowed();
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(dirname(LOCAL_FILE), { recursive: true });
  await writeFile(LOCAL_FILE, JSON.stringify(db, null, 2), 'utf8');
}

/* ------------------------------------------------------------------ */
/* Oyuncular                                                           */
/* ------------------------------------------------------------------ */

export async function getPlayers(): Promise<Player[]> {
  if (hasPostgres()) {
    const rows = await query<PlayerRow>('select id, name, created_at from players order by name');
    return rows.map(toPlayer).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }

  const db = await readLocal();
  return [...db.players].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export async function createPlayer(name: string): Promise<Player> {
  const player: Player = { id: randomUUID(), name, createdAt: Date.now() };
  if (hasPostgres()) {
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
  if (hasPostgres()) {
    await query('update players set name = $2 where id = $1', [id, name]);
    return;
  }

  const db = await readLocal();
  const player = db.players.find((p) => p.id === id);
  if (player) player.name = name;
  await writeLocal(db);
}

export async function deletePlayer(id: string): Promise<void> {
  if (hasPostgres()) {
    await query('delete from votes where player_id = $1', [id]);
    await query('delete from players where id = $1', [id]);
    return;
  }

  const db = await readLocal();
  db.players = db.players.filter((p) => p.id !== id);
  db.votes = db.votes.filter((v) => v.playerId !== id);
  await writeLocal(db);
}

/* ------------------------------------------------------------------ */
/* Maclar                                                              */
/* ------------------------------------------------------------------ */

export async function getMatches(): Promise<Match[]> {
  if (hasPostgres()) {
    const rows = await query<MatchRow>(
      'select id, date, entries, created_at from matches order by date desc, created_at desc',
    );
    return rows.map(toMatch);
  }

  const db = await readLocal();
  return [...db.matches].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export async function getMatch(id: string): Promise<Match | null> {
  if (hasPostgres()) {
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
  if (hasPostgres()) {
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
  if (hasPostgres()) {
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
  if (hasPostgres()) {
    await query('delete from votes where match_id = $1', [id]);
    await query('delete from matches where id = $1', [id]);
    return;
  }

  const db = await readLocal();
  db.matches = db.matches.filter((m) => m.id !== id);
  db.votes = db.votes.filter((v) => v.matchId !== id);
  await writeLocal(db);
}

/* ------------------------------------------------------------------ */
/* Macin adami oylari                                                  */
/* ------------------------------------------------------------------ */

/** Tüm maçların oy dağılımı; puan hesabı ve anket sonucu bundan çıkar. */
export async function getVoteTallies(): Promise<VoteTally[]> {
  if (hasPostgres()) {
    const rows = await query<TallyRow>(
      'select match_id, player_id, count(*)::int as votes from votes group by match_id, player_id',
    );
    return rows.map(toTally);
  }

  const db = await readLocal();
  return tallyVotes(db.votes);
}

/** Tek bir maçın oy dağılımı. */
export async function getMatchTallies(matchId: string): Promise<VoteTally[]> {
  if (hasPostgres()) {
    const rows = await query<TallyRow>(
      'select match_id, player_id, count(*)::int as votes from votes where match_id = $1 group by match_id, player_id',
      [matchId],
    );
    return rows.map(toTally);
  }

  const db = await readLocal();
  return tallyVotes(db.votes.filter((v) => v.matchId === matchId));
}

/** Bu tarayıcı bu maça oy kullanmış mı? Dağılımı yalnızca oy verene göstermek için. */
export async function hasVoted(matchId: string, voterId: string): Promise<boolean> {
  if (hasPostgres()) {
    const rows = await query<{ exists: boolean }>(
      'select true as exists from votes where match_id = $1 and voter_id = $2 limit 1',
      [matchId, voterId],
    );
    return rows.length > 0;
  }

  const db = await readLocal();
  return db.votes.some((v) => v.matchId === matchId && v.voterId === voterId);
}

/**
 * Oyu kaydeder. Aynı tarayıcı (voterId) aynı maça ikinci kez oy veremez;
 * kilit veritabanı tarafında `votes` birincil anahtarıyla sağlanır.
 *
 * @returns Oy kaydedildiyse true, bu tarayıcı zaten oy kullandıysa false.
 */
export async function addVote(matchId: string, playerId: string, voterId: string): Promise<boolean> {
  const createdAt = Date.now();

  if (hasPostgres()) {
    const inserted = await execute(
      `insert into votes (match_id, voter_id, player_id, created_at)
       values ($1, $2, $3, $4)
       on conflict (match_id, voter_id) do nothing`,
      [matchId, voterId, playerId, createdAt],
    );
    return inserted > 0;
  }

  const db = await readLocal();
  if (db.votes.some((v) => v.matchId === matchId && v.voterId === voterId)) return false;

  db.votes.push({ matchId, playerId, voterId, createdAt });
  await writeLocal(db);
  return true;
}
