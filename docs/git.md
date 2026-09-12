# Git

> Lightweight, solo-developer convention — chosen at bootstrap to match how this repo already
> operates (direct commits to `main`/working branches, no PR flow). Revisit if a second regular
> contributor joins.

## Branching

- No forced feature-branch-per-spec — direct commits to your working branch (`main` or a personal
  branch like `dev-agent`) are fine.
- If a change is large or you want a checkpoint before merging, `feature/<short-name>` or
  `fix/<short-name>` is still a fine option — never required.

## Commits

- Descriptive commit messages (not "t", "fix", "wip") — say what changed and, if non-obvious, why.
- Reference the spec id when a spec exists (`specs/active/000N-*.md` or `specs/done/`), e.g.
  `feat: MOTM point crediting [spec 0003]`.
- **You commit and push yourself** — the agent never auto-commits or auto-pushes (standing
  instruction, see project memory `no-auto-commit-push`). Agent-drafted commit messages are
  proposals for you to run, not actions it takes on its own.

## Forbidden

- Force push, history rewriting on `main` — regardless of solo vs. team status. Undo = `git
  revert` (see recovery R-11).

## Pull requests

- Not required for solo work. If you ever open one (e.g. reviewing your own larger change, or a
  future collaborator), `scripts/check` should be green first.
