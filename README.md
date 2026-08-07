# BuilderLoop

BuilderLoop is an Anchor MVP with a reproducible public Devnet demonstration for an ordered campaign path:

`verifier-attested Module → real Clock delay/period gap → same-wallet same-project CohortBuild CPI Ship → fixed pre-funded SPL claim`

The repository contains two real programs:

- `programs/builderloop`: frozen campaign configuration, UserProgress, Ed25519-inspected Module receipts, native Ship validation, and Reward/Claim vault settlement.
- `programs/cohort-build`: the reference Challenge, BuildSubmission, Completion, and source-authority-signed CPI.

The verifier attests Module events. The reference source and test reward authority may be team-controlled. This MVP does not prove unique humans, Sybil resistance, farming prevention, organic retention, sponsor independence, trustless off-chain verification, external adoption, or off-chain payout utility.

## Local verification

```sh
scripts/prepare-localnet.sh
anchor build
anchor test --skip-build
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
pnpm run ci
pnpm secrets
```

The integration suite uses ephemeral local-validator fixtures. The public Devnet release uses a dedicated external fee payer and records only public addresses and transaction signatures. Mainnet is absolutely forbidden. See `docs/DEVNET_RUNBOOK.md` for the guarded deployment/demo path.

## Client surfaces

`pnpm frontend:build` produces the three-screen wallet client in `dist/web`. It connects to a browser Solana wallet, reads CampaignConfig/UserProgress/Reward accounts from the configured RPC, computes exact lock reasons, and submits the fixed `claim_reward` instruction.

The issuer CLI is `node cli/builderloop.js`; run it without arguments for its localnet campaign, attestation, verifier, and reward commands.
