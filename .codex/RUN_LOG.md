# BuilderLoop Run Log

## 2026-08-08

- Resolved the real production deployment from GitHub metadata: `https://builderloop-tan.vercel.app`, deployed successfully from `main` commit `5c75eaf`.
- Verified the production host and seven direct routes over HTTPS; confirmed the Mechanical Manga bundle, `LIVE DEVNET`, Devnet IDs/configuration, proof signatures, and no public private material.
- Ran the read-only `pnpm public:verify` audit over seven routes, three assets, and 32 Devnet Explorer URLs; all passed.
- Ran `pnpm devnet:verify`, `solana program show` for both IDs, `anchor build`, `anchor test --skip-build`, Rust fmt/clippy/tests, `pnpm run ci`, `pnpm frontend:build`, `pnpm secrets`, and `pnpm evidence`; all passed.
- Added the production URL/proof inventory to README and public docs, added `scripts/verify-public-release.js`, and recorded the browser-only limitation: Chromium installation and local Playwright bind remained unavailable.
- Retried `pnpm playwright test` with host-level permission; the runner started all 10 tests but each failed before assertions because `chromium_headless_shell-1187` was absent. No browser PASS is claimed.
- PR #5 opened as a draft into `main`; `local-mvp` passed. The Vercel Preview check failed externally because the Git author lacks access to the Vercel project; no merge was performed.

## 2026-08-05

- Inspected repository folder; no `.git` directory was present.
- Read `PROJECT_SPEC.md`, `TEST_MATRIX.md`, and `WORKPLAN.md`.
- Checked toolchain availability for Git, GitHub CLI, Rust/Cargo, Solana, Anchor, Node.js, npm, pnpm, yarn, and bun.
- Added secure baseline `.gitignore`, `.gitattributes`, and Codex state files.
- Created private GitHub repository `Skizm-tzz/builderloop`.
- Pushed initial specification commit to `main`.
- Created and pushed `codex/night-build`.
- Added dependency-free local protocol model, tests, CLI, evidence export, frontend screens, and CI workflow.
- Verified `pnpm run ci`, `pnpm evidence`, and `pnpm secrets`.
- Performed recovery audit: prior local MVP is a JavaScript simulator and does not satisfy on-chain work-package acceptance criteria.
- Created `backup/pre-migration` and `codex/full-recovery-build` branches.
- Started official GitHub browser authentication for `renkuror`; authorization is pending.
- Installed WSL platform components (restart required) and pinned TypeScript 5.9.3 locally.
- WSL distribution catalog and Chocolatey community repository are currently unreachable.
- Verified GitHub CLI identity as `renkuror`; migrated `main`, `codex/night-build`, `backup/pre-migration`, and `codex/full-recovery-build` to private `renkuror/builderloop` without rewriting history.
- Overnight recovery preflight: verified active branch `codex/full-recovery-build` at `afc7a03`, checked remotes, inspected the specification/work plan/test matrix/checklist/reports/state files, and confirmed the implementation is JavaScript-only rather than an Anchor workspace.
- Verified Git 2.55.0, Rust/Cargo 1.96.0, Node 24.14.1, pnpm 11.9.0, and TypeScript 5.9.3. Solana, Anchor, and AVM are unavailable. WSL returns `E_ACCESSDENIED` in this non-restarted session.
- Retried registry access with `cargo search anchor-cli --limit 1`; it passed. Began pinned `anchor-cli 0.32.1` user-local installation and safely stopped the bounded attempt after 60 seconds without completion.
- WP1 completed locally: added a dependency-free Rust protocol core, frozen binary CampaignConfig/project/Module layouts, Node parity code, and executable wire/overflow vectors. Rust clippy/tests and all existing pnpm checks passed before commit `fd36768` was pushed.
- WP2 in progress: added authority-gated pause/resume/finalization and campaign-bound user-state checks. Focused adversarial Node tests pass.
- WP2 committed and pushed as `8ef0042`. WP3 local-core work now includes receipt cancellation, replay retention after cancellation, and frozen Module-domain/namespace/canonicalizer checks; no Anchor Ed25519 inspection is claimed.
- Continued inside Ubuntu/WSL2; installed and verified Anchor CLI 0.32.1 alongside Agave/Solana CLI and validator 4.1.1.
- Added real BuilderLoop and CohortBuild Anchor programs, strict Ed25519 instruction-sysvar parsing, pending/finalized Module receipts, native wallet-bound CPI, SPL vault/Reward/Claim lifecycle, and a real local-validator integration suite.
- Fixed CPI signer metadata and explicitly serialized Completion before the atomic CPI; local end-to-end test then passed.

## 2026-08-06

- Merged the current `origin/main` Anchor/localnet implementation into `codex/mechanical-manga-frontend` before frontend integration.
- Rebuilt the static frontend as seven Mechanical Manga routes with fixture-only proof states, optional local-validator wallet wiring, sound/keycap interactions, accessibility safeguards, and original keyboard SVG art.
- Added Node unit coverage and Playwright route/interaction/mobile checks; captured eleven actual fixture screenshots under `docs/assets/frontend/` and updated the truthful runbook, shotlist, manual QA, and red-team review.
- Verified `pnpm run ci`, standalone frontend build/tests, Playwright (10 passing), portable `scripts/verify-frontend.sh`, secret scan, and production dependency audit.
- The Windows host lacked Anchor and blocked Cargo build-script execution with `os error 5`; no native/local-validator command was reported as green from this host.
- Committed frontend delivery as `5eba2d1`, pushed `codex/mechanical-manga-frontend`, and opened draft PR #3 into `main` without merging.

## 2026-08-07

- Audited fixed IDs, deploy keypair public keys, IDLs, CPI references, and frontend/localnet wiring on `codex/devnet-release`; no identity regeneration performed.
- Created/configured the external Devnet-only payer, deployed both programs to Devnet, verified each with `solana program show`, and preserved deployment signatures and Explorer links.
- Ran the guarded real Devnet demo with shortened real Clock gates. It verified final Shipped state, Claim PDA, and recipient token balance before writing public evidence.
- Added Devnet runbook, evidence verifier, public frontend config, LIVE DEVNET account reads, Vercel settings, and release report.
- Green: `pnpm run ci`, `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `anchor build`, `anchor test --skip-build`, `pnpm evidence`, `pnpm secrets`, and `pnpm devnet:verify`.
- Playwright install attempts did not populate the pinned Chromium cache; browser smoke remains explicitly blocked and unclaimed.
- Committed as `900d149`, pushed `codex/devnet-release`, and opened [PR #4](https://github.com/renkuror/builderloop/pull/4) into `main`; no merge was performed. Vercel remains an owner-authenticated browser action.
