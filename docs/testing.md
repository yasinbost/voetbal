# Testing

## The contract

- Every acceptance criterion maps to at least one test (criterion ↔ test map lives in the plan).
- Tests assert **behavior** (a business rule, a computed result), not implementation details.
- The whole suite runs inside `scripts/check` — one command, everywhere.

## Frameworks & layout

- **Vitest**, added at bootstrap time (not previously present — this repo had zero tests).
- Test files live next to the module they test, as `<name>.test.ts` (e.g. `src/lib/stats.test.ts`,
  `src/lib/motm.test.ts`).
- No browser/E2E framework for now (decided at bootstrap) — revisit if the app grows past a
  single admin + a handful of components.

## What must be tested

- Every business rule in `docs/domain.md` that lives in a pure function must have a test:
  - `stats.ts`: `computeStats` (participation point, result points, MOTM point crediting,
    average/attendance math, deleted-player handling — BR-1, BR-2, BR-4, BR-8, BR-9) and both
    `sortByPoints`/`sortByAverage` tie-break orders.
  - `motm.ts`: `isPollOpen`/`pollClosesAt` (BR-5), `winnersOf` including the tie-all-win and
    zero-vote cases (BR-7), `motmWinnersByMatch` only crediting closed polls (BR-8),
    `latestMatch` picking by `createdAt` not `date` (BR-6).
  - `actions.ts` validation: match entry validation (BR-3 — min 2 entries, draw-only or
    win+lose-required), voter-id pattern, date-format rejection. These can be tested by exporting
    the validation logic or via the action itself with a stubbed `db`/`auth`.
- New business rules added to `docs/domain.md` must land with a test in the same change — a spec
  without a corresponding test for its acceptance criteria isn't done (see the invariant rules in
  `AGENTS.md`).

## Protected-tests rule

Weakening asserts, deleting, or skipping tests to reach green is forbidden. A red test triggers
`prompts/recovery/red-test.md` (R-02) — first decide what is wrong: code, test, or spec.

## Determinism

Flaky tests are fixed, not retried or skipped — see R-03. Evidence of a fix: 5 consecutive green
runs. `motm.ts`/`stats.ts` tests take `now`/timestamps as explicit arguments specifically so tests
never depend on wall-clock time — keep it that way.
