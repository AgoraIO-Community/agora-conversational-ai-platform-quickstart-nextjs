# AI Agent Instructions

This repository is an outbound PSTN call demo that joins a Conversational AI
agent when a PSTN call is answered. Progressive disclosure docs live under
`docs/ai/` in three levels.

## How to Load

1. Read [docs/ai/L0_repo_card.md](docs/ai/L0_repo_card.md) to identify the repo.
2. Load all 8 files in `docs/ai/L1/`:
   `01_setup.md`, `02_architecture.md`, `03_code_map.md`, `04_conventions.md`,
   `05_workflows.md`, `06_interfaces.md`, `07_gotchas.md`, `08_security.md`.
3. Follow L2 deep-dive links only when L1 is not detailed enough:
   [docs/ai/L1/L2/_index.md](docs/ai/L1/L2/_index.md) then one or more topic files.

## Git Conventions

### Commit messages — conventional commits

- **Format:** `type: description` or `type(scope): description`
- **Types:** `feat:` (new feature), `fix:` (bug fix), `chore:` (maintenance),
  `test:` (test additions/changes), `docs:` (documentation), `refactor:` (refactor)
- **Scoped variant:** `feat(scope):`, `fix(scope):` — e.g. `feat(call): add language picker`
- **Lowercase after prefix** — `feat: add feature`, not `feat: Add feature`
- **Present tense** — "add feature", not "added feature"
- **No AI tool names** in commit messages

### Branch names

- **Format:** `type/short-description` — lowercase, hyphen-separated
- **Types match commit types:** `feat/`, `fix/`, `chore/`, `test/`, `docs/`

Examples:

- `feat/call-webhook-flow`
- `docs/progressive-disclosure`
- `fix/rtm-conn-teardown`

### General rules

- **Repo-local `AGENTS.md` is the authoritative source for repo conventions.**
- **No Co-Authored-By trailers** — omit AI attribution lines
- **No `--no-verify`** — let git hooks run normally
- **No git config changes** — do not modify user.name or user.email

## Doc Commands

| Command | When to use |
| --- | --- |
| `generate docs` | No `docs/ai/` directory exists yet |
| `update docs` | Code changed since last `last_reviewed` date in L0 |
| `test docs` | Verify docs give agents the right context |
| `fix docs` | Close findings from a docs review or test run |

For repository-specific validation:

- Add or update AGENTS and docs under `docs/ai/`.
- Verify `docs/ai/L0_repo_card.md` and all `docs/ai/L1/*.md` exist.
