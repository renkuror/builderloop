# BuilderLoop Project State

Last updated: 2026-08-07 in Ubuntu/WSL2.

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
- `pnpm ci` (frozen dependency install)
- `pnpm frontend:build`
- `pnpm test`
- `sh scripts/verify-frontend.sh`
- `pnpm evidence`
- `pnpm secrets`
- `pnpm devnet:verify`
- `pnpm frontend:serve` plus local HTTP smoke

## Devnet release checkpoint (2026-08-07)

- Preserved audited IDs after checking `declare_id!`, `anchor keys list`, deploy keypair public keys, IDLs, CPI references, and frontend configuration.
- Dedicated Devnet payer is outside the repository at `/home/user/.config/solana/builderloop-devnet.json`; Solana CLI is configured to `https://api.devnet.solana.com` only.
- BuilderLoop and CohortBuild are deployed and confirmed on Devnet with the fixed IDs. `pnpm devnet:demo` completed a real Campaign → Module → Clock gate → native CPI Ship → fixed SPL Claim lifecycle and wrote public evidence.
- `pnpm devnet:verify` passes. `pnpm run ci`, `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, and `anchor test --skip-build` pass.
- Playwright smoke is environment-blocked: the pinned Chromium executable is still absent after installer attempts; no browser pass is claimed.
- Release checkpoint committed as `900d149`, pushed to `codex/devnet-release`, and opened as [PR #4](https://github.com/renkuror/builderloop/pull/4) into `main` without merging. Remaining human action is the owner-only Vercel browser deployment/review.

## 2026-08-06 Frontend checkpoint

- Implemented seven static frontend routes, deterministic fixture states, an optional local-validator client path, original keyboard line art, and responsive Mechanical Manga styling.
- Captured eleven truthful fixture screenshots under `docs/assets/frontend/`; no video, Devnet deployment, or live wallet outcome is claimed.
- Green: `pnpm run ci` (27 tests), `pnpm frontend:build`, `pnpm test` (27 tests), `pnpm playwright test` (10 tests), `sh scripts/verify-frontend.sh`, `pnpm secrets`, and `pnpm audit --prod`.
- This Windows host has no `anchor` executable. `cargo fmt --check` passes, but Cargo custom build scripts fail with Windows `os error 5` even in an isolated temporary target; the Anchor local-validator test also lacks `ANCHOR_PROVIDER_URL`/a running validator. These are recorded as host/toolchain blockers, not green evidence.

## Key paths

- Programs: `programs/builderloop`, `programs/cohort-build`
- Integration: `tests/anchor/localnet.test.js`
- Client/CLI: `web/`, `cli/builderloop.js`
- Evidence/docs: `evidence/`, `docs/`, `DEPLOY.md`, `FINAL_REPORT.md`

## 2026-08-08 — Heartbeat Loyalty MVP

Implemented additive immutable Heartbeat Loyalty PDAs and a loyalty-gated SPL reward consumer. The existing Module → Return → Ship → Reward path remains unchanged. BuilderLoop was upgraded on Devnet at the existing program ID; public Devnet evidence and verification scripts are recorded in `HEARTBEAT_RELEASE_REPORT.md`.
