# Vercel deployment

The frontend is a static bundle produced by the repository’s existing build script. The verified public production alias is [builderloop-tan.vercel.app](https://builderloop-tan.vercel.app). GitHub deployment metadata also reports [builderloop-2kiqqr62o-renkuror1.vercel.app](https://builderloop-2kiqqr62o-renkuror1.vercel.app), but that immutable target is Vercel-auth-protected and is not the judge-facing URL.

## Exact project settings

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm frontend:build`
- Output directory: `dist/web`
- Framework preset: `Other` / static

`vercel.json` records these settings. `pnpm frontend:build` emits `devnet-config.js` from the public `deployments/devnet.json` data and never reads a private key.

## Public configuration

The checked-in Devnet deployment is the default public configuration. Optional public build-time overrides are:

- `PUBLIC_SOLANA_CLUSTER` — must be exactly `devnet`.
- `PUBLIC_SOLANA_RPC_URL` — HTTPS Devnet RPC endpoint.
- `PUBLIC_BUILDERLOOP_PROGRAM_ID` — audited BuilderLoop public ID.
- `PUBLIC_COHORTBUILD_PROGRAM_ID` — audited CohortBuild public ID.

There are no required private environment variables. Never add `ANCHOR_WALLET`, keypair JSON, seed phrases, or fee-payer secrets to Vercel. If an override is used, it must still point to the deployed Devnet programs and public demo accounts.

## Verified production deployment

The GitHub Production deployment completed successfully from the audited `main` commit. The public verification record is [PUBLIC_RELEASE_AUDIT.md](../PUBLIC_RELEASE_AUDIT.md). It checks `LIVE DEVNET`, the configured Campaign/Return Rail account state, direct route navigation, bundle security, and every checked-in Devnet Explorer link.

For a future redeploy, preserve the settings above, keep `PUBLIC_SOLANA_CLUSTER=devnet`, and rerun `pnpm public:verify` against the new URL with `PUBLIC_FRONTEND_URL=https://...`. Mainnet is forbidden.
