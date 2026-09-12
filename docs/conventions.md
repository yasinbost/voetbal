# Conventions

## Language & framework versions

- TypeScript 5.7, `strict: true` (see `tsconfig.json`) — never weaken strict mode to silence an error.
- Next.js 15 (App Router), React 19. Server Components by default; `'use client'` only where
  local interactivity (forms, poll voting) needs it.
- Node's built-in `pg` driver directly — no ORM/query builder (see forbidden dependencies below).
- Zero UI framework: hand-written CSS in `src/app/globals.css`.

## Naming

- Components: `PascalCase.tsx` under `src/components/`, one component per file, default export
  matching the filename (e.g. `MotmPoll.tsx` → `export default function MotmPoll`).
- Library modules: lower-case `src/lib/<concern>.ts`, one concern per file (`db`, `auth`, `stats`,
  `motm`, `types`, `action-state`).
- TS identifiers: `camelCase` for variables/functions, `PascalCase` for types/interfaces,
  `UPPER_SNAKE_CASE` for module-level constants (`POINTS`, `POLL_WINDOW_MS`, `VOTER_ID`).
- Postgres columns are `snake_case` (`created_at`, `match_id`); `db.ts`'s `toPlayer`/`toMatch`/
  `toTally` functions are the only place that translation happens — never leak a `snake_case`
  field into `src/lib/types.ts` or beyond `db.ts`.
- User-facing strings (UI copy, action messages, comments explaining domain behavior) are in
  Turkish, matching the existing codebase and the app's audience. Code identifiers stay English.

## Error handling

- Every Server Action is wrapped in `run()` (`src/app/actions.ts`), which catches and returns
  `{ ok: false, message }` via `ActionState` — actions never throw to the caller.
- `errorMessage()` returns `error.message` verbatim to the caller. This is intentional: the only
  consumer is the single admin, and messages like "which env var is missing" are meant to
  self-diagnose deploys (see `missingDbMessage()` in `db.ts`). Never point-source a *public*,
  unauthenticated action (e.g. `voteMotmAction`) at a raw internal error message beyond what it
  already returns — keep public-facing failures to the short, fixed strings already in use
  ("Anket kapandı.", "Bu tarayıcıdan zaten oy kullanılmış.", etc.).
- Validation failures return `fail('<Turkish message>')` rather than throwing — throwing is
  reserved for truly unexpected states (missing DB connection, corrupt stored JSON).

## Data rules

- Dates are `"YYYY-MM-DD"` strings (validated with `/^\d{4}-\d{2}-\d{2}$/` in `actions.ts`) — never
  a `Date` object in stored data or props.
- Timestamps (`createdAt`) are `number` epoch-milliseconds (`Date.now()`), stored as `bigint` in
  Postgres — not ISO strings.
- IDs are `randomUUID()` strings (`uuid` column type in Postgres).
- Nothing computed (points, averages, attendance, MOTM winners) is ever persisted — always derive
  from `players`/`matches`/`votes` at read time (domain BR-4).
- `entries` is stored as `jsonb` in Postgres and as a plain array in the local JSON fallback;
  `db.ts`'s `toEntries()` is the only place that (de)serialization is handled.

## Enforced by tooling

- TypeScript `strict` mode (compiler) — catches null/undefined and type mismatches; wired into
  `scripts/check` as the `typecheck` step.
- `next build` (also in `scripts/check`) fails on server/client component boundary violations and
  type errors across the app.
- Nothing is currently enforced by a linter — there is no ESLint config in this repo. If that
  changes, wire it into `scripts/check` as a `lint` step rather than leaving it as a manual habit.
