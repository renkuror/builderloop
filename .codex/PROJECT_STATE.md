# BuilderLoop Project State

Last updated: 2026-08-05

## Toolchain

- Git: installed (`git version 2.55.0.windows.3`)
- GitHub CLI: installed (`gh version 2.95.0`)
- Rust/Cargo: installed (`rustc 1.96.0`, `cargo 1.96.0`)
- Solana CLI: not installed in current PATH
- Anchor CLI: not installed in current PATH
- Node.js: installed (`v24.14.1`)
- Package manager: `pnpm 11.9.0`
- npm: installed with Node, but PowerShell script execution policy blocks `npm.ps1`

## Repository

- Initial folder contains only specification documents.
- Git repository not present at first inspection.
- Default branch target: `main`.
- Protected workflow: after the initial specification commit, all implementation work happens on `codex/night-build`.

## Commands

Current bootstrap commands:

- Format: `pnpm format`
- Rust lint/build/tests: blocked until Solana/Anchor or Rust workspace is scaffolded
- TypeScript typecheck: `pnpm typecheck`
- Frontend build: `pnpm build`
- Tests: `pnpm test`
- Secret scan: `pwsh`/PowerShell `rg` patterns documented in run log

## Current Package

WP0: audit, specification lock, Git/GitHub setup.

## Blockers

- Solana CLI is missing.
- Anchor CLI is missing.
- Network/package installation may require explicit approval if dependency downloads are needed.
