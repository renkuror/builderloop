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

Verified local commands:

- Format: `pnpm format`
- Lint: `pnpm lint`
- Typecheck substitute: `pnpm typecheck`
- Unit tests: `pnpm test`
- Local build: `pnpm build`
- Frontend build: `pnpm frontend:build`
- Full local suite: `pnpm run ci`
- Evidence export: `pnpm evidence`
- Secret scan: `pnpm secrets`
- Rust lint/build/tests: blocked until Solana/Anchor workspace is scaffolded
- TypeScript typecheck: `pnpm typecheck`
- Frontend build: `pnpm build`
- Tests: `pnpm test`

## Current Package

WP1 local model is green on `codex/night-build`.

Implemented locally:

- deterministic config hash and project ID helpers;
- Module voucher hash surface;
- campaign freeze/start and authority checks;
- user initialization and Module pending/finalized transitions;
- stale verifier and challenge delay checks;
- same-wallet same-project native Ship validation;
- fixed reward funding/activation/claim lifecycle;
- CLI commands and evidence export;
- static Campaign, Progress, and Reward screens;
- GitHub Actions CI for local checks.

## Blockers

- Solana CLI is missing.
- Anchor CLI is missing.
- Network/package installation may require explicit approval if dependency downloads are needed.
