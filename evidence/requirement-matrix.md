# BuilderLoop Requirement-to-Evidence Matrix

This matrix distinguishes executable local-model evidence from unimplemented on-chain requirements. No Anchor or local-validator result is inferred from a Node or Rust model test.

| Requirement | Production/model file | Test ID | Command | Result | Commit |
|---|---|---|---|---|---|
| Deterministic config, project, and Module bytes/hashes | `crates/protocol-core/src/lib.rs`, `src/protocol.js` | A01-A09 | `cargo test -p builderloop-protocol-core`; `pnpm test` | PASS (local vectors) | `fd36768` |
| Campaign authority, freeze, pause, verifier epoch, and user binding | `src/protocol.js` | B01-B09, C01-C05 | `pnpm test` | PASS (local model) | `8ef0042` |
| Module receipt lifecycle, local replay retention, and signed fixed payload | `src/protocol.js::{CampaignLedger,verifyModuleAttestation}` | D01-D14, D16 subset | `pnpm test` | PASS (local Node Ed25519 verification); instruction-sysvar offsets absent | pending green checkpoint |
| Completion source owner/authority/discriminator/deterministic account identity | `src/protocol.js::{completionPda,recordNativeShip}` | E05-E14 subset | `pnpm test` | PASS (local model) | pending green checkpoint |
| Reward authority, fixed amount, one claim per wallet, pause, withdrawal, close | `src/protocol.js::{RewardLedger,createReward,withdrawRemainingInventory,closeReward}` | F01-F20 subset | `pnpm test` | PASS (local model) | pending green checkpoint |
| Actual Anchor accounts, Ed25519 sysvar, CPI, SPL vault, and local validator | absent | D15-D16, E01-E15, F01-F21, H01-H03 | `anchor build`; local-validator integration suite | BLOCKED: programs and toolchain absent | — |
| Frontend program-state integration and wallet connection | absent; `web/` is static preview | G01-G08 | `pnpm frontend:build` | Preview build PASS; integration NOT IMPLEMENTED | — |
| Devnet deployment | intentionally excluded | H08 | no command permitted | NOT EXECUTED — POST-AUDIT PHASE | — |
