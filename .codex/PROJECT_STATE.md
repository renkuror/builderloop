# BuilderLoop Project State

Last updated: 2026-08-05 in Ubuntu/WSL2.

## Completed

- WP1 deterministic Rust/JavaScript wire layouts and vectors.
- WP2 real CampaignConfig/UserProgress Anchor state machines.
- WP3 strict Ed25519 instruction inspection, one-use ModuleReceipt pending/cancel/finalize lifecycle, verifier epoch invalidation, and Artifact Lineage.
- WP4 real CohortBuild Challenge/Submission/Completion and wallet-bound source-PDA-signed CPI Ship with exact Completion validation.
- WP5 classic SPL Token Reward/Claim/vault lifecycle, fixed transfers, deadline withdrawal, and explicit rent destinations.
- WP6 issuer/reward CLI and three-screen wallet client reading actual program accounts and submitting claims.
- WP7 local adversarial hardening and truthful architecture/threat/trust documentation.
- WP8 local build/test evidence and reproducible commands.

The pre-existing JavaScript model remains only a parity/reference layer. Completion claims are based on `programs/` plus local-validator tests.

## Toolchain

- Ubuntu 24.04.1 / WSL2; Rust/Cargo 1.97.1.
- Agave/Solana CLI and `solana-test-validator` 4.1.1.
- Anchor CLI/crates 0.32.1; AVM executable 1.1.2 is not used for selection.
- Node 24.16.0; pnpm 11.9.0; TypeScript 5.9.3.

## Green commands

- `cargo fmt --check`
- `cargo clippy --workspace --all-targets -- -D warnings`
- `cargo test --workspace`
- `anchor build`
- `anchor test --skip-build`
- `pnpm run ci`
- `pnpm evidence`
- `pnpm secrets`

## Current / next

- Current: final release report, checklist reconciliation, clean checkpoint, push, and PR update.
- Devnet/mainnet: explicitly excluded, not pending.

## Key paths

- Programs: `programs/builderloop`, `programs/cohort-build`
- Integration: `tests/anchor/localnet.test.js`
- Client/CLI: `web/`, `cli/builderloop.js`
- Evidence/docs: `evidence/`, `docs/`, `DEPLOY.md`, `FINAL_REPORT.md`
