# Autonomous Work Plan

Mark progress here. Do not replace this plan unless the repository materially conflicts.

Priority:
- P0 protocol correctness/local core;
- P1 usable demo;
- P2 external deployment evidence.

## WP0 — Audit and specification lock [P0]

- inspect git and preserve user work;
- inspect structure/toolchain/commands/AGENTS files;
- create `.codex` state files;
- select compatible pinned versions;
- write ADRs for PDA seeds, layouts, hash serialization, attestation bytes, project_id, vault authority, period calculation;
- map existing code to spec;
- identify external blockers without stopping local work.

Acceptance:
- concrete bootstrap/build path;
- one authoritative definition for every critical byte layout/seed;
- PROJECT_STATE.md has commands and next package.

## WP1 — Workspace and deterministic primitives [P0]

- initialize/normalize Anchor workspace;
- add builderloop and cohort-build programs;
- shared TS protocol package if useful;
- pure helpers: period calculation, config bytes/hash, attestation bytes, project_id, reward capacity;
- Rust/TS golden vectors;
- CI commands.

Acceptance:
- cross-language bytes/hashes match;
- overflow/boundary tests pass;
- format/lint/build commands work.

Commit: `chore: initialize builderloop workspace`

## WP2 — CampaignConfig and UserProgress [P0]

- implement campaign account/statuses/instructions;
- freeze full config/hash;
- pause/resume/finalize;
- verifier deactivation/epoch;
- UserProgress/init_user/stages;
- errors/events/tests.

Acceptance:
- no critical mutation after freeze;
- authorities/timing/pause/finalize/stage tests pass.

Commit: `feat: add campaign and user state machines`

## WP3 — Module attestation and Artifact Lineage [P0]

- ModuleReceipt;
- fixed binary voucher;
- Ed25519 inspection;
- pending delay/cancel/finalize;
- project_id/project_seed_hash;
- fixed namespace/version/current epoch;
- public vectors/artifact;
- CLI voucher creation/inspection.

Acceptance:
- pending cannot unlock Ship;
- early finalize, wrong domain/user/epoch, malformed signature, replay all fail;
- deactivation behavior works;
- Rust/TS vectors match.

Commit: `feat: add module attestation and artifact lineage`

## WP4 — CohortBuild and native CPI Ship [P0]

- Challenge, BuildSubmission, Completion;
- meaningful completion condition;
- source authority PDA and CPI;
- record_native_ship;
- exact Completion validation;
- same wallet/project/challenge/source/time/period;
- events.

Acceptance:
- wrong wallet/project/challenge/discriminator/owner/PDA/authority all fail;
- early/before-Module/duplicate Ship fail;
- valid CPI advances atomically.

Commit: `feat: add wallet-bound native ship CPI`

## WP5 — Reward vault lifecycle [P0]

- Reward/Claim;
- canonical vault;
- create/fund/activate;
- pause/resume;
- fixed claim;
- withdraw after deadline;
- close;
- config snapshot;
- token constraints;
- final-inventory concurrency test.

Acceptance:
- funding, mint, authority, amount, eligibility, duplicate, inventory, withdrawal, and close tests pass.

Commit: `feat: add funded reward lifecycle`

## WP6 — CLI and frontend [P1]

- complete issuer/reward CLI;
- Campaign, Progress, Reward screens;
- wallet integration;
- exact lock reasons;
- role labels;
- config/source/reward identities;
- privacy;
- cluster-aware Explorer links;
- error/loading/empty states;
- smoke/E2E.

Acceptance:
- typecheck/build/tests pass;
- progression sourced on-chain;
- no excluded scope;
- test/demo roles labeled.

Commit: `feat: add issuer CLI and frontend flows`

## WP7 — Adversarial hardening [P0/P1]

- implement TEST_MATRIX.md;
- inspect signers/owners/PDAs/close/token/timestamps;
- remove unwrap/unchecked math/cast risks;
- verify hash coverage;
- align README claims;
- add architecture/threat/trust/demo docs.

Acceptance:
- every P0 test passes;
- full available suite passes;
- remaining P1 issues justified;
- no unsupported claims.

Commit: `test: harden protocol invariants`

## WP8 — Local release evidence [P1]

- reproducible local setup;
- sample fixture/artifact;
- local E2E and negative-flow commands;
- DEPLOY.md;
- evidence templates with real local values;
- FINAL_REPORT.md;
- final clean build/test.

Acceptance:
- fresh developer can reproduce;
- real/local/test/blocked states are distinct;
- worktree clean or documented.

Commit: `docs: add reproducible release evidence`

## WP9 — Devnet [P2, conditional]

Attempt only if network, safe Devnet keypair, tools, and Devnet SOL already exist.

- deploy both programs;
- record IDs/slots;
- initialize real campaign;
- publish config hash;
- use real Clock;
- fund/activate/claim test payout;
- store real links.

If unavailable:
- do not fabricate;
- finish DEPLOY.md;
- record blocker and exact next commands;
- continue local work.

Commit: `chore: add devnet deployment evidence`
