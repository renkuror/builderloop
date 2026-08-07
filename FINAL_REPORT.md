# BuilderLoop Final Report

## Status

The localnet MVP and public Devnet release are complete. The production frontend is [builderloop-tan.vercel.app](https://builderloop-tan.vercel.app); the release audit is tracked in [PUBLIC_RELEASE_AUDIT.md](PUBLIC_RELEASE_AUDIT.md) and [DEVNET_RELEASE_REPORT.md](DEVNET_RELEASE_REPORT.md). Mainnet remains absolutely forbidden.

## Completed work packages

- WP0: repository/specification audit, frozen layouts, toolchain pin and state records.
- WP1: Anchor workspace plus deterministic Rust/JavaScript config, project, attestation, period, and capacity primitives.
- WP2: CampaignConfig and UserProgress accounts and authority/stage state machines.
- WP3: exact Ed25519 instruction-sysvar parsing, one-use ModuleReceipt pending/cancel/finalize flow, verifier epoch invalidation, and Artifact Lineage.
- WP4: CohortBuild Challenge/BuildSubmission/Completion and wallet-bound source-PDA-signed CPI Ship.
- WP5: classic SPL Token Reward/Claim/vault lifecycle with fixed claims and deadline-gated remainder settlement.
- WP6: localnet issuer/reward CLI and three-screen wallet-connected account reader/claim client.
- WP7: adversarial local/model suites, lint hardening, secret scan, architecture/threat/trust truth review.
- WP8: reproducible local genesis execution, evidence artifacts, deployment/demo docs, and final report.

## Repository architecture

- `programs/builderloop`: campaign, Module, Ship, Reward, and Claim program.
- `programs/cohort-build`: reference source program and native CPI.
- `crates/protocol-core`, `src/protocol.js`: deterministic parity vectors/reference model.
- `tests/anchor/localnet.test.js`: real validator, CPI, token, and adversarial execution.
- `cli/builderloop.js`: localnet issuer/reward operator commands.
- `web/`: Campaign, Progress, and Reward wallet client.

## Security invariants implemented

- Frozen deterministic eligibility hash and immutable critical identities.
- Ordered signer-bound progression; pending Module cannot Ship.
- Exact one-signature Ed25519 offsets/key/message/domain inspection and event PDA replay resistance.
- Current verifier epoch required at submission/finalization; deactivation invalidates pending receipts.
- Solana Clock campaign, elapsed-time, challenge-delay, and period gates with checked arithmetic.
- Exact source owner/program/authority/discriminator/layout/PDA/bump/user/project/challenge/artifact validation.
- CohortBuild source PDA signs the atomic native CPI; Completion is serialized before CPI.
- Reward snapshots config hash, uses classic SPL Token and a Reward-controlled vault, fixes claim amount, binds recipient owner/mint, and permits one Claim PDA per wallet.
- Deadline-gated remainder withdrawal and explicit Reward/vault rent destination.

## Tests

| Command | Result | Notes |
|---|---|---|
| `cargo fmt --check` | PASS | Entire Rust workspace |
| `cargo clippy --workspace --all-targets -- -D warnings` | PASS | No accepted warnings |
| `cargo test --workspace` | PASS | 7 Rust unit/vector tests including program IDs |
| `anchor build` | PASS | BuilderLoop and CohortBuild SBF/IDL artifacts |
| `anchor test --skip-build` | PASS | Real local validator; Ed25519, receipt, CPI, SPL, pause/replay/epoch/withdraw/close adversarial flow |
| `pnpm run ci` | PASS | 27 Node tests, format/lint/typecheck/build and production frontend bundle |
| `pnpm evidence` | PASS | Local/test-only artifacts regenerated |
| `pnpm secrets` | PASS | Ignored validator/build sockets and artifacts excluded; no finding |

## Commits

- `fd36768` — deterministic protocol core and vectors.
- `8ef0042` — campaign and user state hardening.
- `758c8f1` — preserved Module-ledger checkpoint.
- `816a113` — real on-chain progression and reward flow.
- `a2f7081` — wallet client, CLI, and expanded adversarial localnet flows.
- Final documentation/checklist commit: inspect `HEAD`.

## Local demo

1. `scripts/prepare-localnet.sh`
2. `anchor build`
3. `anchor test --skip-build`
4. `pnpm frontend:build`
5. `python3 -m http.server 4173 --directory dist/web`

The validator test creates ephemeral real accounts and transitions Module pending → finalized → native CPI Shipped → fixed SPL Claim, then proves negative and terminal reward paths.

## Devnet evidence

- Verified in `deployments/devnet.json`, `evidence/devnet-addresses.json`, and `evidence/transaction-links.json`.
- The real public lifecycle includes Module finalization, native CPI Ship, and fixed SPL Claim links. See `DEVNET_RELEASE_REPORT.md`.
- The production frontend exposes the same real evidence at `https://builderloop-tan.vercel.app/evidence/`.

## External blockers

- None for localnet scope.
- No independent sponsor, organic retention, external adoption, or off-chain payout evidence is claimed.

## Known limitations

- One fixed campaign topology, verifier, source, and reward authority; no generic builder or verifier registry.
- Trusted verifier and configured source semantics remain explicit trust boundaries.
- Browser wallet behavior is production-bundled and source-checked; extension UI automation and browser console inspection were unavailable during the public audit because the pinned Chromium executable could not be installed.
- Local validator transaction signatures are ephemeral and intentionally not presented as durable explorer evidence.

## Exact next commands

```sh
scripts/prepare-localnet.sh
anchor build
anchor test --skip-build
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
pnpm run ci
pnpm evidence
pnpm secrets
```

## Manual review hotspots

- Campaign hash field order and intentional operational verifier deactivation after freeze.
- Ed25519 one-signature header, `u16::MAX` instruction indices, offsets, and exact message bytes.
- Completion serialization before CPI and source-authority signer metadata.
- Completion owner/discriminator/exact length/PDA/bump and frozen field comparisons.
- Reward signer seeds, classic token-program restriction, recipient constraints, and Reward/vault close destinations.

## 2026-08-06 frontend evidence update

- Added the Mechanical Manga judge frontend across seven direct routes, deterministic fixture states, an optional local-validator wallet path, and 11 actual fixture screenshots under `docs/assets/frontend/`.
- Historical 2026-08-06 Windows checkpoint: `pnpm run ci` (27 Node tests), `pnpm frontend:build`, `pnpm playwright test` (10 browser tests), `sh scripts/verify-frontend.sh`, `pnpm secrets`, `pnpm audit --prod`, and `cargo fmt --check` were recorded there. The 2026-08-08 public audit separately records current Linux/Devnet results and the current browser limitation.
- Current Windows toolchain limitation: `anchor` is not installed; Cargo custom build scripts fail to execute with `os error 5`; and no local validator/provider is configured. These current-host failures do not replace the historical localnet evidence above and are not reported as green.
- The frontend claims Devnet only when the checked-in deployment status is `deployed`; it never claims sponsor activity, Sybil resistance, retention, or a recorded video.

## 2026-08-08 Heartbeat Loyalty MVP

Additive immutable Heartbeat Loyalty policy/state/receipt/reward-gate PDAs are implemented and deployed on Devnet with real public evidence. The original CohortBuild reference flow remains intact. See `HEARTBEAT_RELEASE_REPORT.md` for current IDs, transactions, checks, and the remaining production-promotion limitation.
