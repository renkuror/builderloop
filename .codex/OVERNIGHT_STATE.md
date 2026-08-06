# Overnight State

## WSL recovery toolchain (2026-08-05)

- Ubuntu 24.04.1 under WSL2 (`6.6.87.2-microsoft-standard-WSL2`).
- Rust/Cargo `1.97.1`; Node.js `24.16.0`; pnpm `11.9.0`.
- Agave `solana-cli 4.1.1` and `solana-test-validator 4.1.1`.
- User-local Anchor CLI was replaced with the repository-compatible `anchor-cli 0.32.1` via `cargo install anchor-cli --version 0.32.1 --locked --force`.
- AVM executable reports `1.1.2`; it belongs to the newer OtterSec distribution and is not used to select the pinned Anchor CLI.
- Verified commands: `solana --version`, `solana-test-validator --version`, `anchor --version`, `avm --version`, `anchor build`, and `anchor test --skip-build`.
- `anchor build` produces both SBF programs; `anchor test --skip-build` passes the first real local-validator Module → native CPI Ship → SPL claim flow plus authority/Ed25519/replay negatives.
- The three prompt-provided objects `6330ece`, `ab05ae0`, and `0356d33` are not present in this migrated clone. Current preserved history starts its protocol recovery at `fd36768`, `8ef0042`, and `758c8f1`; no reset or history rewrite was performed.

## Started
2026-08-05T03:59:25+06:00 — Windows PowerShell; branch `codex/full-recovery-build`; commit `afc7a0329b12c3de3f23e38cb54206bf392b0b47`; remote `origin` (`https://github.com/renkuror/builderloop.git`).

## Current package
WP3: Module receipt lifecycle and Artifact Lineage hardening.

## Last green checkpoint
`8ef0042` / 2026-08-05T04:19:12+06:00 — WP2 verified and pushed.

## Verified complete
- Repository is on a non-main development branch.
- pnpm 11.9.0, Node 24.14.1, Rust/Cargo 1.96.0, Git 2.55.0, and TypeScript 5.9.3 are available.
- WP1 deterministic binary config/project/attestation layouts and Rust/Node parity vectors pass.
- Checked schedule/period/reward-capacity boundaries pass in the Rust core.
- Campaign authority, pause/resume, finalization, verifier deactivation, and campaign-wallet binding adversarial tests pass.
- WP3 local receipt ledger enforces canonical event single-use across cancellation, receipt lifecycle, expiry/epoch/user rejection, and frozen local domain fields.

## Currently implementing
- Signed Module payload validation, replay protection, cancellation, and receipt-finalization adversarial tests.

## Next
- Complete WP3, then CohortBuild/native Ship validation.

## Tests currently green
- `cargo clippy -p builderloop-protocol-core --all-targets -- -D warnings`
- `cargo test -p builderloop-protocol-core` (5 tests)
- `pnpm test` (15 focused tests at the last complete run; current full rerun pending).
- `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm frontend:build`, `pnpm evidence`, `pnpm secrets`

## Current failures
- `cargo install --version 0.32.1 anchor-cli --locked` exceeded the 60-second no-progress limit and was terminated.
- Anchor Ed25519 instruction inspection and actual PDA account execution remain unavailable without the Anchor/Solana validator stack; the local receipt-ledger tests do not replace those program tests.

## External blockers
- Solana CLI and Anchor CLI are unavailable. WSL reports `E_ACCESSDENIED` and requires a Windows restart; local Anchor-validator integration cannot execute until a supported toolchain is installed.

## 2026-08-05 continuation checkpoint
- Baseline verification passed: `pnpm run ci` (15 Node tests) and Rust format/clippy/tests (5 tests).
- RED checkpoint `6330ece` adds executable reward authority, lifecycle, fixed-amount, and one-claim-per-wallet adversarial coverage.
- GREEN local-model implementation is ready for checkpointing; it is not evidence of an SPL vault or on-chain PDA.
- Local Module attestation now verifies Ed25519 payload signatures; the Anchor Ed25519 instruction-sysvar requirement remains blocked on the absent on-chain program/toolchain.
