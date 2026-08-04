# BuilderLoop Project State

Last updated: 2026-08-05T03:59:25+06:00

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

## Current execution

- The prior JavaScript implementation has been reclassified as an incomplete protocol sketch, not deployed-program evidence.
- The current recovery work starts with a dependency-free Rust protocol core plus TypeScript parity vectors, so deterministic P0 behavior remains testable while the validator toolchain is unavailable.
- `cargo search anchor-cli --limit 1` succeeded after an escalated registry-access retry. The first pinned `anchor-cli 0.32.1` installation attempt was stopped after 60 seconds without a completed build; no partial installation is considered usable.
- WP1 is verified in commit `fd36768`: Rust/Node binary bytes, SHA-256 hashes, project commitment, Module payload vectors, schedule bounds, and reward capacity are covered by executable local tests.
- WP2 is locally verified and awaiting its checkpoint commit: authority-gated campaign lifecycle controls and user campaign binding are covered by focused negative tests plus the full Node suite.

## Next actions

1. Complete and test WP1 deterministic Rust/TypeScript vectors.
2. Implement and adversarially test the campaign/module/ship/reward protocol core.
3. Retry local Anchor/Solana installation only through a materially different documented route after a Windows restart; until then, preserve exact local-validator commands and do not claim those tests ran.
