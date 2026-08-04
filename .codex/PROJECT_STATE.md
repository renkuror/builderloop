# BuilderLoop Project State

Last updated: 2026-08-05

## Repository and migration

- Active branch: `codex/full-recovery-build`.
- Safety branch: `backup/pre-migration` at the pre-recovery `codex/night-build` tip.
- Old remote: `https://github.com/Skizm-tzz/builderloop.git`.
- Requested new remote: `renkuror/builderloop`.
- GitHub CLI verified `renkuror`; migration completed. `origin` is `https://github.com/renkuror/builderloop.git` and `old-origin` preserves the prior repository.

## Verified work status

The previous JavaScript implementation is a behavioral simulation only. No Anchor workspace, on-chain account validation, Ed25519 instruction inspection, source-program CPI, SPL vault transfer, wallet integration, or cross-program test exists yet. Therefore WP1-WP8 are incomplete. Full claimed-versus-verified details are in `.codex/MIGRATION_AUDIT.md`.

## Toolchain

- Installed: Git 2.55.0, GitHub CLI 2.95.0, Rust/Cargo 1.96.0, rustfmt, clippy, Node 24.14.1, npm 11.18.0, pnpm 11.9.0, TypeScript 5.9.3.
- Missing: Solana CLI, Anchor CLI/AVM, a WSL distribution, native build tools.
- WSL platform installation ran successfully and requires Windows restart. WSL distribution catalog lookup currently fails with `Wsl/WININET_E_CANNOT_CONNECT`.
- Exact environment notes: `docs/TOOLCHAIN.md`.

## Commands

- Existing simulation checks: `pnpm run ci`, `pnpm evidence`, `pnpm secrets`.
- TypeScript verification: `.\\node_modules\\.bin\\tsc.cmd --version`.
- On-chain build/test commands will be added only after the actual Anchor workspace and supported WSL toolchain exist.

## Next actions

1. Restart Windows, install Ubuntu WSL, then install pinned Solana and Anchor tooling.
2. Scaffold the two-program Anchor workspace and implement WP1 with Rust/TypeScript vectors before all later packages.
