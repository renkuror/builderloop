# BuilderLoop Decisions

## 2026-08-05: Initial Repository Baseline

- Use `main` as the default branch.
- Use `codex/night-build` for all implementation after the initial specification commit.
- Use `pnpm` as the Node package manager because it is installed and avoids the local PowerShell `npm.ps1` execution-policy block.
- Do not fabricate Devnet addresses, transaction links, sponsors, funding, or live evidence.
