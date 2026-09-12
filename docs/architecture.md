# Architecture

## System overview

A single Next.js 15 App Router application (TypeScript) — no separate backend service. All reads
happen in server components; all writes go through Server Actions so credentials and mutation
logic never ship to the browser. Data lives in Postgres (Neon/Supabase via Vercel Storage) in
production, with a local JSON file (`data/local-db.json`) as a dev-only fallback when no
connection string is configured. Chosen for the simplest possible deploy (one Vercel project, one
GitHub push) for a project one person maintains for a friend group — see `docs/decisions/` for
any ADR that revisits this.

## Modules / components and ownership

| Module | Single responsibility | Owns |
|---|---|---|
| `src/lib/db.ts` | Persistence: Postgres when configured, local JSON otherwise; env-name resolution for prefixed connection strings. | `players`, `matches`, `votes` storage and the read/write functions over them. |
| `src/lib/types.ts` | Shared data model and scoring constants. | `Player`, `Match`, `MatchEntry`, `Vote`, `VoteTally`, `PlayerStats`, `POINTS`/`PARTICIPATION_POINT`/`MOTM_POINT`/`POLL_WINDOW_MS`. |
| `src/lib/stats.ts` | Turning raw players/matches (+ resolved MOTM winners) into ranked `PlayerStats`. | Scoring math, both sort orders, display formatting (`formatAverage`, `formatAttendance`, `formatDate`). |
| `src/lib/motm.ts` | Poll timing and winner resolution. | `pollClosesAt`, `isPollOpen`, `winnersOf`, `motmWinnersByMatch`, `latestMatch`. |
| `src/lib/auth.ts` | Single-password admin session. | Password check, session cookie issue/verify, `requireAdmin()` guard. |
| `src/app/actions.ts` | All Server Actions (the only place writes happen). | Input validation, calling `db`/`auth`/`motm`, `revalidatePath`, uniform `ActionState` results. |
| `src/app/page.tsx`, `src/app/admin/page.tsx` | Server-rendered pages; assemble data for the components below. | Route-level data fetching and MOTM/poll display wiring. |
| `src/components/*` | Presentation + client-side form state (`useActionState`) for one concern each (`Leaderboard`, `AdminPanel`, `MatchForm`, `MotmPoll`, `MatchHistory`, `PlayerManager`). | Their own markup/CSS classes; no direct DB access. |

## Communication rules

- Components never call `db.ts` directly — they call a Server Action (`actions.ts`) or receive
  server-fetched data as props from a page.
- `actions.ts` is the only module allowed to call `requireAdmin()` and mutate through `db.ts`;
  read-only pages call `db.ts`'s getters directly (no action needed for reads).
- `stats.ts` and `motm.ts` are pure functions of their arguments (no I/O) — they take data in,
  return data out. Keep it that way; it's what makes them the natural home for tests.

## Forbidden dependencies (make them testable)

- `src/components/**` must never import from `src/lib/db.ts` or `pg` — an architecture/lint check
  can assert no `db`/`pg` import appears under `components/`.
- `src/lib/stats.ts` and `src/lib/motm.ts` must not import `next/headers`, `pg`, or perform any
  I/O — they stay pure and synchronous.
- Nothing outside `src/lib/auth.ts` reads or compares `ADMIN_PASSWORD`/`FALLBACK_PASSWORD`
  directly — all admin checks go through `requireAdmin()`/`isAdmin()`.

## Deliberately out of scope

- Per-user accounts/identity (single shared admin password is the whole auth model).
- Any server-side caching or pre-aggregation of standings — recomputing live is the point (see
  domain BR-4).
- Multi-league / multi-tenant support — one league per deployment.
