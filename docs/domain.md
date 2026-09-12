# Domain

## Ubiquitous language

| Term | Meaning | Notes / not to be confused with |
|---|---|---|
| Player (Oyuncu) | A person who can appear in matches. `{ id, name, createdAt }`. | Not a user account — no login, no per-player auth. |
| Match (Maç) | One weekly game: a date plus a list of entries. `{ id, date, entries[], createdAt }`. | `date` is the match's calendar date; `createdAt` is when the record was saved — these drive different things (see poll below). |
| Match entry (MatchEntry) | One player's result within a match: `{ playerId, result }`. | `result` is `'win' \| 'lose' \| 'draw'`. |
| Points (Puan) | Per-entry score: participation +1, plus result points (win +1, draw +0, lose +0). Net: win 2, draw 1, loss 1. | Not stored — recomputed every time from match records. |
| MOTM ("Maçın adamı") | The most-voted player in a match's post-game poll. | A per-match honor, not a season award. |
| MOTM point | +1 extra point added to each MOTM winner (ties all win) once that match's poll has closed. | Only applied after the poll closes — never while voting is open. |
| Poll window | The MOTM poll stays open for `POLL_WINDOW_MS` (3 hours) after the match's `createdAt`. | Keyed off *when the match was recorded*, not the match `date`. |
| Voter id | A random id generated client-side and kept in `localStorage`, used as the vote's identity. | Not an authenticated identity — clearing storage or an incognito tab can re-vote. Deliberate trade-off for a friend league (see `docs/security.md`). |
| Average (Ortalama) | Total points ÷ matches played. 0 if the player hasn't played yet. | Players with 0 matches are listed separately, not ranked among averages. |
| Attendance (Katılım) | Matches played ÷ total matches recorded. | Informational only — never affects sort order. |
| Admin | The single shared role that can add/edit/delete players and matches. | Not a per-person account; one password for whoever administers the league. |

## Business rules

- BR-1: Every player who appears in a match's entries gets **+1 participation point**, regardless of result.
- BR-2: Result points stack on top of BR-1: win +1, draw +0, loss +0 (net per player: win 2, draw 1, loss 1).
- BR-3: A match must have at least 2 entries, and either every entry is `draw`, or the match has at least one `win` and one `lose` entry (mixed win/draw/lose is rejected; see `saveMatchAction`).
- BR-4: All standings are **derived live** from `players` + `matches` (+ resolved MOTM winners) on every read — nothing is pre-aggregated or cached in storage. Editing or deleting a match self-corrects the table.
- BR-5: A match's MOTM poll opens the instant the match is saved and closes `POLL_WINDOW_MS` (3h) after that match's `createdAt` — the match `date` is irrelevant to the poll's timing.
- BR-6: The active poll (if any) is always for the **most recently created** match, not the match with the latest `date`.
- BR-7: A poll's winner is whoever has the most votes among that match's current participants; on a tie, **all** tied players win and each gets the MOTM point. Zero votes ⇒ no winner.
- BR-8: MOTM points are only credited once a poll has closed — an in-progress poll never changes the leaderboard.
- BR-9: A player deleted after playing in past matches keeps those matches' history, but their points no longer count in current standings (their id is filtered out of the live stats map).
- BR-10: One vote per `(matchId, voterId)`, enforced by a DB primary key / local-store dedupe — not per-person, per-browser-identity.
- BR-11: Vote **tallies** are only shown to a voter who has already voted for that match, or to anyone once the poll has closed.

## Key domain invariants

- Standings must always be reproducible purely from `players` + `matches` + `votes` — never introduce a stored/cached point total.
- A poll's outcome must never affect points while the poll is still open.
- Sorting for the main leaderboard is always: points ↓, then wins ↓, then matches played ↓, then name (locale `tr`). Sorting for the average tab is: average ↓, then matches played ↓, then name. Don't drift these without updating this file.
