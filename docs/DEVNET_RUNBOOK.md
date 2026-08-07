# BuilderLoop Devnet Runbook

This is the reproducible public Devnet path for the fixed BuilderLoop MVP. Mainnet is forbidden. The checked-in program identities are audited and intentionally reused on Devnet:

- BuilderLoop: `3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2`
- CohortBuild: `BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF`

## Prerequisites

Use the dedicated fee payer outside the repository at `~/.config/solana/builderloop-devnet.json`. Never copy its private bytes into logs, environment variables, frontend assets, or Git. The CLI must report `https://api.devnet.solana.com` before deployment or demo work:

```sh
solana config set --url devnet --keypair ~/.config/solana/builderloop-devnet.json --commitment confirmed
solana config get
solana balance --url devnet
```

If the RPC or keypair is not Devnet-only, stop. Do not use `solana config set --url mainnet-beta` for this release.

## Build and deploy

Audit `declare_id!`, `anchor keys list`, `target/deploy/*-keypair.json` public keys, IDLs, and CPI references before changing identities. This repository has matching public keys, so regeneration is unnecessary. Verify Devnet immediately before each deployment:

```sh
NO_DNA=1 anchor build
solana config get
NO_DNA=1 anchor deploy --program-name builderloop \
  --provider.cluster devnet \
  --provider.wallet ~/.config/solana/builderloop-devnet.json \
  --program-keypair target/deploy/builderloop-keypair.json
solana config get
solana program show 3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2 --url devnet
solana config get
NO_DNA=1 anchor deploy --program-name cohort_build \
  --provider.cluster devnet \
  --provider.wallet ~/.config/solana/builderloop-devnet.json \
  --program-keypair target/deploy/cohort_build-keypair.json
solana config get
solana program show BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF --url devnet
```

Do not claim a deployment until both `solana program show` calls confirm executable upgradeable programs. Deployment signatures and Explorer links are stored in `deployments/devnet.json`.

## Real demo lifecycle

The one-command workflow validates the Devnet genesis hash, loads the external payer, checks both programs, and uses real preflight-simulated transactions:

```sh
NO_DNA=1 pnpm devnet:demo
```

It creates a clearly labeled `DEMO CONFIGURATION` with shortened real Solana Clock gates, then executes Campaign → signed Module attestation → pending receipt → Module finalization → elapsed/period gate → CohortBuild Completion → native CPI Ship → create/fund/activate fixed SPL Reward → Claim. It refetches and validates the final accounts before writing public-only evidence.

The command updates `deployments/devnet.json`, `evidence/devnet-addresses.json`, and `evidence/transaction-links.json`. It never writes role secret keys. The public frontend consumes the resulting deployment configuration at build time.

Verify evidence:

```sh
NO_DNA=1 pnpm devnet:verify
```

This checks the Devnet genesis, program owners/executability, confirmation status and error state of the key transactions, and account owners for the recorded addresses.

## Public evidence

The current release evidence includes Explorer links for BuilderLoop, CohortBuild, Module finalization, native CPI Ship, and fixed SPL Claim. The test mint has no implied value. The configured verifier, source semantics, and reward authority are explicit trust boundaries; no Sybil-resistance, sponsor-independence, organic-retention, or adoption claim is made.
