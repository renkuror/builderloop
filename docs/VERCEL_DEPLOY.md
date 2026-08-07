# Vercel deployment

The frontend is a static bundle produced by the repository’s existing build script. Do not fabricate a Vercel URL; the owner must complete the final browser login/deploy step.

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

## Owner actions

1. Open Vercel and sign in as the repository owner.
2. Import the GitHub repository and select branch `codex/devnet-release` (or the reviewed PR branch).
3. Confirm the settings above and deploy.
4. Open the generated HTTPS URL and check `LIVE DEVNET`, the Campaign/Return Rail account state, and every Explorer link.

The repository does not contain a Vercel URL because none has been created by the owner.
