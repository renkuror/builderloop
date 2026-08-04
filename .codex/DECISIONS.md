# BuilderLoop Decisions

## 2026-08-05: Initial Repository Baseline

- Use `main` as the default branch.
- Use `codex/night-build` for all implementation after the initial specification commit.
- Use `pnpm` as the Node package manager because it is installed and avoids the local PowerShell `npm.ps1` execution-policy block.
- Do not fabricate Devnet addresses, transaction links, sponsors, funding, or live evidence.

## 2026-08-05: Frozen deterministic wire layouts

- `CampaignConfig` hash input is binary, not JSON: `BUILDERLOOP_CONFIG_V1` followed by the exact field order in `crates/protocol-core/src/lib.rs::config_bytes`; integers are little-endian and booleans are one byte.
- `project_id` is SHA-256 over `BUILDERLOOP_PROJECT_V1 || program_id || campaign || user || project_seed_hash`.
- Module vouchers use the fixed-width `BUILDERLOOP_MODULE_V1` layout in `attestation_bytes`; no user-selected namespace/canonicalizer value is serialized into a voucher.
- The Rust core is dependency-free so byte vectors and overflow rules remain executable before Anchor/Solana installation. It is not evidence that an on-chain program has been deployed or exercised.

## 2026-08-05: Local reward model authorization boundary

- The local reward model requires the frozen reward authority for create, fund, activate, pause/resume, deadline withdrawal, and closure. It tracks one claim per reward-wallet in `RewardLedger`.
- These tests model the production invariants but do not prove SPL Token ownership, PDA derivation, or a deployed vault authority. Those requirements remain blocked on Anchor/Solana local-validator work.
