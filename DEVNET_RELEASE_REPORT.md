# BuilderLoop Devnet Release Report

## Status

Devnet deployment and the real public demonstration are verified on `codex/devnet-release`. Mainnet was not used. The existing audited program identities were preserved.

## Programs

- BuilderLoop: `3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2` — [Explorer](https://explorer.solana.com/address/3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2?cluster=devnet)
- CohortBuild: `BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF` — [Explorer](https://explorer.solana.com/address/BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF?cluster=devnet)

Deployment signatures:

- BuilderLoop: `4QAkx52MevfydGHKPSNcVEqXNGvdPpTZRYwkN9AJKC6WKTEvEBZXpxnKPhig6nuRwdftXT1S7tihBbMFVra9tpTm`
- CohortBuild: `64AogE32ADR79sLxT8c1HUey8xsnVVBsaqBY9yagac3fQB9RNGwKyE16znpXWJ15LS5PAj4VUho6qSQdN4KA9hqu`

## Demonstration

The verified DEMO CONFIGURATION uses real Solana Clock gates shortened to 2 seconds, one 2-second period, and a 1-second Module challenge delay. Demo Campaign: `G5NZMxbV5xgnYS2dxLBDJGAZTigMJQaH8c73tSswLLHb`.

Important accounts are maintained in [evidence/devnet-addresses.json](evidence/devnet-addresses.json). The fixed test mint is `FLHwwyaMZLnuRX7Upph219rjDFXUGtudZixYUKf7TBmb`; it has no implied value.

Key proof transactions:

- [Module finalization](https://explorer.solana.com/tx/2Bp2tzGwmrzxXjEyomqWzMjECKifVHAqvK2b4K622KvBFuHnS6EfFkKzo9cmfxUR8f8LTTwS5wJcoZzkHfFPXne9?cluster=devnet)
- [CohortBuild native CPI → BuilderLoop Shipped](https://explorer.solana.com/tx/5YknRqK7vDviFqNf4Lq9ogw8MSDyJ6eSQ6VLNotzBZ7oLDk3uCdE1sj79VHzhcfZteyTFxpFbP7HzrwaC7vUkHdP?cluster=devnet)
- [Fixed SPL Reward Claim](https://explorer.solana.com/tx/4amsThi4sYufPZr2vNVpWYyk4LjoBEznSfC44PapphfqTpwxEUXiQQc7SmxfxJNTnUsgxo1RN1kf42PstZtJTAB4?cluster=devnet)

## Frontend

The Mechanical Manga frontend keeps its existing design and now builds a public `devnet-config.js`. It displays `LIVE DEVNET`, reads the configured Campaign/UserProgress/Reward accounts from Devnet RPC, and links only to genuine Devnet accounts and transactions. No private key is present in frontend configuration.

Production settings and owner-only deployment actions are in [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md). No Vercel URL is claimed.

## Verification

- `anchor build`: PASS
- `pnpm run ci`: PASS (27 Node tests, format/lint/typecheck/build/frontend bundle)
- `pnpm frontend:build`: PASS
- `pnpm devnet:verify`: PASS (Devnet genesis, program owners, key transaction confirmations, recorded account owners)
- `pnpm secrets`: PASS
- `cargo fmt --all -- --check`: PASS
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS
- `cargo test --workspace`: PASS (7 Rust tests)
- `NO_DNA=1 anchor test --skip-build`: PASS (localnet integration regression)
- `pnpm frontend:serve` plus local HTTP smoke: PASS (static bundle, `devnet-config.js`, Devnet IDs, and evidence route served)
- Playwright browser smoke: blocked because the environment’s Playwright Chromium cache remains empty after installer attempts; no browser tests are claimed green.

## Reproduction

See [docs/DEVNET_RUNBOOK.md](docs/DEVNET_RUNBOOK.md). The one-command demo is `NO_DNA=1 pnpm devnet:demo`; it verifies Devnet genesis, uses the external dedicated fee payer, executes the real lifecycle, refetches final state, and writes public evidence.

## Branch, commits, and PR

- Branch: `codex/devnet-release`
- Release commits and Pull Request URL are recorded here after the final push checkpoint.

## Known limitations and remaining human actions

- The verifier and reference source authority are configured trust boundaries; this release makes no Sybil-resistance, proof-of-personhood, sponsor-independence, organic-retention, or adoption claim.
- The demo’s short timing is explicitly demo-only; production timing must be configured before freeze.
- A human owner must log into Vercel, import the repository, use the documented static settings, and review the resulting `LIVE DEVNET` site.
