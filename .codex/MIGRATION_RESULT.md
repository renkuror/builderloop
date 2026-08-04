# BuilderLoop Migration Result

Completed: 2026-08-05

- Active authenticated GitHub account: `renkuror` (verified with `gh api user --jq .login`).
- Old repository retained as `old-origin`: `https://github.com/Skizm-tzz/builderloop.git`.
- New private repository and `origin`: `https://github.com/renkuror/builderloop.git`.
- Default branch: `main` at `93b0b98c6e4e9b5e32319471b0abe2ef1937ebc2`.

## Migrated branches

| Branch | Head |
|---|---|
| `main` | `93b0b98c6e4e9b5e32319471b0abe2ef1937ebc2` |
| `codex/night-build` | `9fb9d724556e59ea7e464afac161fc4393a3d7f5` |
| `backup/pre-migration` | `9fb9d724556e59ea7e464afac161fc4393a3d7f5` |
| `codex/full-recovery-build` | `65d5a5d9fe26e88d20b2fb1a4f438e23f3a5dcf6` |

## Tags

No tags existed locally or on the destination.

## Unmigrated items

None. The existing destination history was related and matched the local `main` and `codex/night-build` heads, so it was retained without overwrite.
