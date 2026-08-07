# BuilderLoop Public Release Audit

Audit date: 2026-08-08 (Asia/Almaty)

## Production URL and overall status

- Canonical production URL: [https://builderloop-tan.vercel.app](https://builderloop-tan.vercel.app)
- GitHub deployment metadata target: [https://builderloop-2kiqqr62o-renkuror1.vercel.app](https://builderloop-2kiqqr62o-renkuror1.vercel.app) (auth-protected; not the judge-facing URL)
- Source commit: `5c75eaf` (`main`)
- Overall status: **VERIFIED for public HTTPS delivery and Devnet evidence.** No repository-side blocking defect remains.

The browser-only portion is explicitly limited: repeated Chromium install attempts left only a partial Playwright cache without an executable. With `PUBLIC_FRONTEND_URL` enabled, all 10 Playwright tests failed before assertions because `/home/user/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell` is missing; the default local-server run also could not bind `127.0.0.1:4173` (`EPERM`). Therefore this report does not claim an interactive browser, wallet-extension, visual viewport, or console PASS. The production route, bundle, configuration, link, and on-chain checks are green.

Mainnet was not used.

The GitHub deployment target is genuine deployment metadata but redirects unauthenticated requests to Vercel login. All public checks and judge-facing documentation use the canonical alias above.

## Frontend verification

| Check | Result | Evidence |
|---|---|---|
| Production URL loads | PASS | Canonical host returned HTTP 200 and the GitHub Production deployment status is `success`. |
| Mechanical Manga frontend | PASS | Public bundle contains the keyboard line-art UI and `Points cannot substitute for return.`. |
| Environment identity | PASS | `/devnet-config.js` contains `cluster: "devnet"`, `live: true`, and `https://api.devnet.solana.com`; the app renders `LIVE DEVNET`. |
| Prepared Devnet campaign | PASS | Campaign `G5NZMxbV5xgnYS2dxLBDJGAZTigMJQaH8c73tSswLLHb` is configured in the public bundle and verified on Devnet as BuilderLoop-owned, 270-byte, Active account state. |
| Wallet-free judge path | PASS (HTTP/source) | `/demo/` returns the app shell; the live branch renders the public proof path without wallet requirements. Interactive click execution is browser-limited as described above. |
| Return Rail | PASS (implementation/on-chain state) | The live branch refetches finalized Devnet state before deriving the rail; observed Campaign `Active`, UserProgress `Shipped`, and Reward `Active`, claimed `1/1`. No fixture scenario controls are rendered when live configuration is valid. |
| No fixture data represented as live | PASS | Live rendering uses the real `DEMO CONFIGURATION` accounts and proof signatures; fixture playback is only the non-live fallback branch. |
| Dead/fake controls | PASS (source) | Return Rail buttons, sound toggle, wallet connect, account load, and claim controls have handlers; claim remains disabled until signer/account/state checks pass. Browser click execution is unclaimed. |
| Direct route navigation/refresh | PASS | `/`, `/demo/`, `/campaign/`, `/progress/`, `/reward/`, `/architecture/`, and `/evidence/` each returned HTTP 200 with the application shell. |
| Desktop/mobile behavior | LIMITED | Responsive CSS and narrow-screen safeguards are covered by repository tests. A new public viewport run was not possible without Chromium. |
| Runtime/console errors | LIMITED | No browser console was available because Chromium could not be launched. All fetched HTML/assets returned successfully; no failed production asset response was observed. |

The live proof links expose the fixed Devnet demo configuration, not sponsor, adoption, retention, Sybil-resistance, or token-value claims.

## Devnet program verification

`pnpm devnet:verify` passed against the Solana Devnet genesis hash. `solana program show --url devnet` also passed for both deployed programs.

| Program | Devnet ID | Deployment state |
|---|---|---|
| BuilderLoop | [`3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2`](https://explorer.solana.com/address/3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2?cluster=devnet) | Executable, owned by `BPFLoaderUpgradeab1e11111111111111111111111` |
| CohortBuild | [`BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF`](https://explorer.solana.com/address/BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF?cluster=devnet) | Executable, owned by `BPFLoaderUpgradeab1e11111111111111111111111` |

The verifier also confirmed all recorded evidence accounts exist on Devnet and have the expected program/token owners.

## Transaction verification

`pnpm devnet:verify` checked each signature with Devnet `getSignatureStatus(..., searchTransactionHistory: true)`, requiring a confirmation status and `err === null`.

| Evidence | Signature | Result |
|---|---|---|
| Module Finalization | [`2Bp2tzGwmrzxXjEyomqWzMjECKifVHAqvK2b4K622KvBFuHnS6EfFkKzo9cmfxUR8f8LTTwS5wJcoZzkHfFPXne9`](https://explorer.solana.com/tx/2Bp2tzGwmrzxXjEyomqWzMjECKifVHAqvK2b4K622KvBFuHnS6EfFkKzo9cmfxUR8f8LTTwS5wJcoZzkHfFPXne9?cluster=devnet) | PASS: confirmed, no error |
| CohortBuild native CPI → BuilderLoop `Shipped` | [`5YknRqK7vDviFqNf4Lq9ogw8MSDyJ6eSQ6VLNotzBZ7oLDk3uCdE1sj79VHzhcfZteyTFxpFbP7HzrwaC7vUkHdP`](https://explorer.solana.com/tx/5YknRqK7vDviFqNf4Lq9ogw8MSDyJ6eSQ6VLNotzBZ7oLDk3uCdE1sj79VHzhcfZteyTFxpFbP7HzrwaC7vUkHdP?cluster=devnet) | PASS: confirmed, no error |
| Fixed SPL Reward Claim | [`4amsThi4sYufPZr2vNVpWYyk4LjoBEznSfC44PapphfqTpwxEUXiQQc7SmxfxJNTnUsgxo1RN1kf42PstZtJTAB4`](https://explorer.solana.com/tx/4amsThi4sYufPZr2vNVpWYyk4LjoBEznSfC44PapphfqTpwxEUXiQQc7SmxfxJNTnUsgxo1RN1kf42PstZtJTAB4?cluster=devnet) | PASS: confirmed, no error |

No replacement transaction was generated during this audit.

The native CPI Ship transaction’s finalized logs show CohortBuild invoking BuilderLoop and both programs returning success. The Claim transaction logs show BuilderLoop `ClaimReward` followed by successful classic SPL Token invocation.

## Route and link verification

`pnpm public:verify` passed against the canonical production URL. It checked:

- seven direct HTML routes, including direct-navigation/refresh URLs: all HTTP 200 with the application shell;
- `/app.js`, `/styles.css`, and `/devnet-config.js`: all HTTP 200;
- 32 unique checked-in account, program, deployment, and transaction Explorer URLs: all HTTP 2xx and all retained `?cluster=devnet`;
- 40 local links in the README, release reports, deployment guide, and final report: all resolved.

The same public IDs and proof links are exposed in the [README](README.md), [Devnet release report](DEVNET_RELEASE_REPORT.md), and the frontend’s `/evidence/` route.

## Security verification

- `pnpm secrets`: PASS; no repository secret-pattern findings.
- Public bundle scan: PASS; no private key, seed phrase, deployment keypair, verifier private material, reward-authority private material, credential token, or secret environment value was found.
- Public configuration contains only Devnet RPC, program IDs, demo PDAs, public signatures, and Explorer URLs.
- No Mainnet RPC or Mainnet cluster configuration is exposed.
- No wallet signing or transaction generation was performed by this audit.

## Tests and exact results

| Command | Result |
|---|---|
| `pnpm run ci` | PASS: format, lint, typecheck, 27 Node tests, model build, frontend build |
| `pnpm frontend:build` | PASS |
| `pnpm public:verify` | PASS: 7 routes, 3 assets, audited config/proof inventory, 32 Explorer links, 40 documentation links |
| `pnpm devnet:verify` | PASS: Devnet genesis, 2 programs, 3 required transactions, 13 evidence accounts |
| `pnpm secrets` | PASS |
| `pnpm evidence` | PASS |
| `pnpm audit --prod` | PASS: no known vulnerabilities |
| `cargo fmt --all -- --check` | PASS |
| `cargo clippy --workspace --all-targets -- -D warnings` | PASS |
| `cargo test --workspace` | PASS: 7 Rust unit/vector tests |
| `anchor build` | PASS: BuilderLoop and CohortBuild release artifacts |
| `anchor test --skip-build` | PASS: local-validator Module → native CPI Ship → fixed SPL reward integration suite |
| `solana program show 3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2 --url devnet` | PASS: executable BuilderLoop program on Devnet |
| `solana program show BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF --url devnet` | PASS: executable CohortBuild program on Devnet |
| PR #5 `local-mvp` check | PASS |
| PR #5 Vercel Preview check | EXTERNAL BLOCKER: Vercel reports Git author `Skizm-tzz` lacks access to the Vercel project; canonical production was independently verified and no repository fix can change this permission. |
| `PUBLIC_FRONTEND_URL=https://builderloop-tan.vercel.app pnpm playwright test` | BLOCKED before assertions: 10 tests could not launch because the pinned Chromium headless shell is missing; no PASS claimed |

## Fixes made

- Added the verified canonical Live Demo URL and all required real Devnet evidence links to `README.md`.
- Corrected `DEVNET_RELEASE_REPORT.md`, `FINAL_REPORT.md`, and `docs/VERCEL_DEPLOY.md` so they no longer claim that no Vercel URL exists.
- Added `scripts/verify-public-release.js` and the `pnpm public:verify` command for reproducible public route, bundle, security-marker, audited config/proof, Explorer-link, and documentation-link checks.
- Corrected the live Devnet E2E heading expectation and added `PUBLIC_FRONTEND_URL` support so future Playwright runs can target the canonical public host without starting a local server.
- Updated the compact Codex state, decision, blocker, and run-log records with the audit result and browser limitation.

## Remaining limitations

- Browser-level visual, console, mobile viewport, and wallet-extension verification remains pending a host with a working Chromium executable. Public HTTP and Devnet verification are complete.
- PR preview deployment is permission-blocked by the Vercel team, although the existing canonical production alias is public and verified. A Vercel project owner must grant the Git author access if PR previews are required.
- This is one fixed Devnet demo campaign with shortened Clock gates and a test SPL mint. The verifier and reference source authority are explicit trust boundaries.
- No Mainnet deployment, independent sponsor, organic retention, proof of personhood, Sybil-resistance, or off-chain payout utility is claimed.

## Reproduction

```sh
pnpm install --frozen-lockfile
pnpm run ci
pnpm frontend:build
pnpm secrets
pnpm devnet:verify
PUBLIC_FRONTEND_URL=https://builderloop-tan.vercel.app pnpm public:verify
PUBLIC_FRONTEND_URL=https://builderloop-tan.vercel.app pnpm playwright test
anchor build
anchor test --skip-build
```

See [docs/DEVNET_RUNBOOK.md](docs/DEVNET_RUNBOOK.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and [docs/TRUST_MODEL.md](docs/TRUST_MODEL.md) for the guarded Devnet flow, architecture, and trust boundaries.
