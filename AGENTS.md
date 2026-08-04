# BuilderLoop Codex Instructions

## Mission

Build a submission-grade local MVP of BuilderLoop:

`verified Module -> real time/period gap -> same-wallet same-project native Ship -> Shipper -> pre-funded fixed SPL payout`

Prioritize protocol correctness, explicit trust boundaries, deterministic tests, and reproducible evidence over feature count.

## Instruction precedence

1. Security invariants in this file.
2. PROJECT_SPEC.md.
3. TEST_MATRIX.md.
4. WORKPLAN.md.
5. Existing repository conventions.
6. The smallest secure implementation.

Record deviations in `.codex/DECISIONS.md`.

## Mandatory scope

The MVP includes:
- one campaign;
- one fixed Module verifier;
- one reward authority;
- one attested Module milestone;
- one real time and period gap;
- one wallet-bound native Ship milestone;
- Artifact Lineage;
- one Shipper state;
- one fixed SPL payout;
- one reference CohortBuild program;
- three frontend screens;
- one issuer CLI;
- adversarial tests.

The MVP excludes:
- points and leaderboards;
- referrals;
- AI scoring;
- ZK and proof of personhood;
- Sybil-resistance claims;
- generic campaign builders;
- arbitrary milestone DAGs;
- verifier registries;
- NFT badges or marketplaces;
- universal reputation;
- mobile apps;
- mainnet deployment;
- fake sponsors or fake retention evidence.

## Security invariants

Never weaken these to make tests pass:

1. Campaign eligibility configuration is immutable after freeze.
2. Config hash is deterministic and includes every eligibility-critical field.
3. Module must be finalized before Ship.
4. Ship must satisfy minimum elapsed time and minimum period gap.
5. Completion must belong to the same wallet as UserProgress.
6. Completion must contain the project_id committed by Module.
7. Completion owner, discriminator, PDA, challenge ID, source program, and source authority must match frozen config.
8. User signs the Ship transaction.
9. Module vouchers are domain-separated by BuilderLoop program ID and campaign.
10. Source namespace and canonicalizer version are frozen, not user-controlled.
11. A canonical Module event is usable once per campaign.
12. Verifier cannot be added or replaced after freeze.
13. Verifier can be deactivated; stale-epoch pending receipts cannot finalize.
14. Pending Module does not unlock Ship.
15. Reward snapshots CampaignConfig.config_hash.
16. Reward cannot activate without valid funding.
17. Claim amount is fixed in Reward, never supplied by user.
18. Recipient token account belongs to claiming signer and uses reward mint.
19. One Claim PDA exists per reward and wallet.
20. Remainder withdrawal occurs only after deadline.
21. No secrets are committed.
22. No tests, timestamps, sponsors, transactions, or integrations are fabricated.

## Autonomous behavior

Do not wait for the user unless an action outside the repository is destructive.

When blocked:
1. inspect the error;
2. try one targeted fix;
3. try one documented fallback;
4. record the blocker;
5. continue unrelated work.

Fallbacks:
- No network: finish local implementation/tests/docs and write DEPLOY.md.
- No Devnet SOL/keypair: generate exact deployment scripts; do not invent links.
- No real sponsor: use a clearly labeled test reward authority.
- Real-time gap unavailable: test with short local fixtures while keeping production-safe validation; label live evidence pending.
- Toolchain conflict: inspect installed versions, select and pin a compatible set, document it.

## Token and context economy

- Read long specs once per session.
- Maintain `.codex/PROJECT_STATE.md` as compact execution memory.
- Search before reading; use targeted ranges.
- Patch minimal areas; do not rewrite entire files for small changes.
- Keep verbose logs under `.codex/logs/`; inspect failure tails first.
- Run focused tests during a package, full suite at package end.
- Do not reinstall dependencies when caches/lockfiles are valid.
- Avoid repeated general research.
- Do not duplicate documentation.
- Do not narrate routine actions.
- Do not design optional features until core is green.

## Git protocol

Before work:
- inspect `git status`;
- preserve user changes;
- never reset, clean, rebase, force-push, or amend;
- initialize git only if needed.

After each green work package:
- run checks;
- update PROJECT_STATE.md;
- commit once;
- confirm git status.

Suggested commits:
- `chore: initialize builderloop workspace`
- `feat: add campaign and user state machines`
- `feat: add module attestation and artifact lineage`
- `feat: add wallet-bound native ship CPI`
- `feat: add funded reward lifecycle`
- `feat: add issuer CLI and frontend flows`
- `test: harden protocol invariants`
- `docs: add reproducible release evidence`

## Toolchain

Detect installed tools first. Pin a mutually compatible stack rather than blindly using latest:
- Rust;
- Solana CLI;
- Anchor;
- Node.js and repository package manager;
- TypeScript/Next.js;
- SPL Token libraries;
- unit/integration/E2E tools.

Preserve/create lockfiles and reproducible environment notes. Do not upgrade major versions without necessity.

## Required checks

Discover exact commands and store them in PROJECT_STATE.md. Provide equivalents for:
- formatting;
- Rust lint;
- program build;
- unit tests;
- cross-program integration tests;
- TypeScript typecheck;
- frontend production build;
- frontend smoke/E2E tests.

Run all available checks before final completion.

## Code quality

- explicit custom errors;
- checked arithmetic;
- centralized seeds/layouts/domains;
- shared deterministic vectors;
- pure helpers for hashing, period calculations, and transitions;
- high-signal security comments;
- no `unwrap`, unchecked casts, silent truncation, or client-trusted timestamps;
- do not trust user-supplied owners, authorities, source types, token amounts, or periods.

## Documentation truthfulness

Allowed claims:
- same-wallet burst resistance;
- ordered campaign progression;
- exact event replay resistance under fixed namespace;
- recipient-bound native completion;
- frozen eligibility;
- fixed reward settlement;
- separate authority roles.

Forbidden without evidence:
- Sybil resistance;
- proof of unique humans;
- farming prevention;
- independent sponsor;
- organic retention;
- trustless off-chain verification;
- external adoption;
- guaranteed off-chain utility.

## State files

Maintain:
- `.codex/PROJECT_STATE.md`
- `.codex/DECISIONS.md`
- `.codex/BLOCKERS.md`
- `.codex/RUN_LOG.md`
- `FINAL_REPORT.md`
