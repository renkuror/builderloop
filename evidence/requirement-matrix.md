# BuilderLoop Requirement-to-Evidence Matrix

Only locally executed evidence is listed. Devnet evidence was not produced.

| Requirement | Implementation | Executed evidence | Result |
|---|---|---|---|
| Deterministic config/project/attestation bytes | `crates/protocol-core`, `src/protocol.js`, BuilderLoop hash/message helpers | `cargo test --workspace`; `pnpm test` | PASS |
| Frozen campaign and ordered UserProgress | `programs/builderloop` campaign/user instructions | local-validator integration plus model adversarial tests | PASS |
| Exact Ed25519 sysvar inspection and pending receipt | `submit_module_attestation`, `inspect_ed25519`, ModuleReceipt PDA | valid, malformed-offset, substituted-message, wrong-verifier, early-finalize cases in `anchor test --skip-build` | PASS |
| Wallet/project-bound native CPI | `programs/cohort-build::complete_build`, `record_native_ship` | real signed CPI, Completion validation, duplicate rollback in `anchor test --skip-build` | PASS |
| Pre-funded fixed SPL payout | Reward/Claim/vault instructions | underfunded activation, stage/recipient/pause, exact transfer, duplicate claim, early/late withdrawal and close cases | PASS |
| Three wallet-connected screens | `web/index.html`, `web/app.js` | `pnpm run ci` production bundle and smoke assertions | PASS |
| Issuer/reward CLI | `cli/builderloop.js` | vector commands covered by Node tests; on-chain commands use generated IDL/localnet provider | IMPLEMENTED; manual operator surface |
| Secrets and truthful claims | `.gitignore`, secret scanner, README/docs | `pnpm secrets`; documentation review | PASS |
