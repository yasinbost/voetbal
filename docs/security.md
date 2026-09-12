# Security

## Secrets

- Secrets never enter the repo, specs, prompts, or chat. `.env`/`.env.local` are gitignored;
  `.env.example` documents the shape without real values.
- Agents never print secret values (`ADMIN_PASSWORD`, connection strings), even when debugging —
  point to the env var name, not its value.

## Accepted risks (closed friend-league context)

This app's threat model is "keep randoms from editing a friend group's scoreboard," not
multi-tenant SaaS security. The following are **deliberate, documented trade-offs** — don't "fix"
them without a spec, and don't treat them as bugs in review:

- **Single shared admin password**, no per-person accounts (`src/lib/auth.ts`). Anyone with the
  password can add/edit/delete anything.
- **`FALLBACK_PASSWORD` hardcoded** in `src/lib/auth.ts`, used whenever `ADMIN_PASSWORD` is unset.
  This value is in git history and is a real weakness if `ADMIN_PASSWORD` is ever left unset in a
  real deploy. **Follow-up (not fixed by bootstrap, needs its own spec):** make a missing
  `ADMIN_PASSWORD` fail closed (refuse admin login with a clear error) instead of silently
  defaulting.
- **Unauthenticated MOTM voting**: voter identity is a random id generated in `localStorage`
  (`voterId`), not tied to any real identity. Clearing storage or using another browser/incognito
  session lets someone vote again. Enforced only at the `(match_id, voter_id)` level, by design —
  see domain BR-10.
- **Raw error messages returned to the admin** (`errorMessage()` in `actions.ts`) — intentional
  for a single trusted admin to self-diagnose deploy issues (see `docs/conventions.md`).

## Input & output

- All write paths go through Server Actions (`src/app/actions.ts`), which validate shape before
  touching `db.ts` (date format, non-empty names, valid `MatchResult`, minimum 2 entries, win/lose
  consistency, voter-id pattern). Never trust `FormData` values without the same validation this
  file already does.
- Public-facing failures (`voteMotmAction`, `motmTalliesAction`) return short, fixed Turkish
  strings — never a raw internal error or stack trace to an unauthenticated caller.
- SQL is always parameterized (`$1`, `$2`, …) via `pg` — never string-interpolate a value into a
  query.

## AuthN / AuthZ

- `requireAdmin()` (`src/lib/auth.ts`) must be the first call inside every mutating Server Action
  that isn't the public MOTM vote — default-deny: no action skips this check to "save a step."
  the login/vote actions are the only two writes with a different gate (password check; poll-open
  + participant check, respectively).
- The session cookie stores a derived token (`sha256` of the password), never the password itself,
  is `httpOnly`, `sameSite: lax`, and `secure` in production.

## Dependencies

- Adding a dependency requires updating `docs/conventions.md`'s forbidden-dependency list or
  explicitly noting the exception in the PR/commit — see the forbidden list in
  `docs/architecture.md` and `docs/conventions.md` (no ORM, no CSS framework, no state-management
  or new auth/session libraries without an ADR).
- No automated dependency/CVE scanning is configured. With five production dependencies, review
  new additions by hand before adding them.

## Review lens

Security is a mandatory dimension of every independent review (see `prompts/review.md`), not a
separate afterthought phase. A reviewer should specifically check: does a new admin action call
`requireAdmin()`? Does a new public action leak more than a short fixed string on failure? Does
any new query interpolate a value instead of parameterizing it?
