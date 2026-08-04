# BuilderLoop Requirement-to-Evidence Matrix

This matrix records only commands that executed in this local recovery run. Anchor and local-validator results are not substituted with model-test results.

| Requirement | Production file/function | Test ID | Test command | Result | Commit |
|---|---|---|---|---|---|
| Frozen binary campaign configuration serialization | `crates/protocol-core/src/lib.rs::config_bytes`, `src/protocol.js::configBytes` | A01/A03 | `cargo test -p builderloop-protocol-core`; `node --test test/wire-vectors.test.js` | PASS | pending WP1 checkpoint |
| Deterministic config hash | `config_hash`, `configHash` | A01/A02 | same | PASS | pending WP1 checkpoint |
| Project commitment layout | `project_id`, `projectId` | A04 | same | PASS | pending WP1 checkpoint |
| Fixed Module attestation layout | `attestation_bytes`, `attestationBytes` | A05 | same | PASS | pending WP1 checkpoint |
| Period/reward arithmetic boundary rejection | `period_for`, `required_reward_inventory` | A06-A09 | `cargo test -p builderloop-protocol-core`; `node --test test/wire-vectors.test.js` | PASS | pending WP1 checkpoint |
| Anchor/local-validator execution | not yet available | H01/H03 | `anchor build`, Anchor integration suite | BLOCKED: Solana/Anchor unavailable | — |
