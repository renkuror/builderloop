# BuilderLoop

BuilderLoop is an Anchor MVP with a reproducible public Devnet demonstration for an ordered campaign path:

`verifier-attested Module → real Clock delay/period gap → same-wallet same-project CohortBuild CPI Ship → fixed pre-funded SPL claim`

The repository contains two real programs:

- `programs/builderloop`: frozen campaign configuration, UserProgress, Ed25519-inspected Module receipts, native Ship validation, and Reward/Claim vault settlement.
- `programs/cohort-build`: the reference Challenge, BuildSubmission, Completion, and source-authority-signed CPI.

The verifier attests Module events. The reference source and test reward authority may be team-controlled. This MVP does not prove unique humans, Sybil resistance, farming prevention, organic retention, sponsor independence, trustless off-chain verification, external adoption, or off-chain payout utility.

## Public production release

- Live Demo: [builderloop-tan.vercel.app](https://builderloop-tan.vercel.app)
- GitHub: [renkuror/builderloop](https://github.com/renkuror/builderloop)
- BuilderLoop Devnet Program: [`3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2`](https://explorer.solana.com/address/3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2?cluster=devnet)
- CohortBuild Devnet Program: [`BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF`](https://explorer.solana.com/address/BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF?cluster=devnet)
- Module Finalization: [Devnet transaction](https://explorer.solana.com/tx/2Bp2tzGwmrzxXjEyomqWzMjECKifVHAqvK2b4K622KvBFuHnS6EfFkKzo9cmfxUR8f8LTTwS5wJcoZzkHfFPXne9?cluster=devnet)
- Native CohortBuild CPI → Shipped: [Devnet transaction](https://explorer.solana.com/tx/5YknRqK7vDviFqNf4Lq9ogw8MSDyJ6eSQ6VLNotzBZ7oLDk3uCdE1sj79VHzhcfZteyTFxpFbP7HzrwaC7vUkHdP?cluster=devnet)
- SPL Reward Claim: [Devnet transaction](https://explorer.solana.com/tx/4amsThi4sYufPZr2vNVpWYyk4LjoBEznSfC44PapphfqTpwxEUXiQQc7SmxfxJNTnUsgxo1RN1kf42PstZtJTAB4?cluster=devnet)
- Public audit: [PUBLIC_RELEASE_AUDIT.md](PUBLIC_RELEASE_AUDIT.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Trust boundaries: [docs/TRUST_MODEL.md](docs/TRUST_MODEL.md)

This release uses Solana Devnet only. The public judge path is read-only and does not require a wallet; optional wallet controls are explicitly labeled `LIVE DEVNET`. The fixed test mint has no implied value, and no Mainnet operation is supported.

## Local verification

```sh
scripts/prepare-localnet.sh
anchor build
anchor test --skip-build
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
pnpm run ci
pnpm secrets
pnpm devnet:verify
pnpm public:verify
```

The integration suite uses ephemeral local-validator fixtures. The public Devnet release uses a dedicated external fee payer and records only public addresses and transaction signatures. Mainnet is absolutely forbidden. See `docs/DEVNET_RUNBOOK.md` for the guarded deployment/demo path.

## Client surfaces

`pnpm frontend:build` produces the Mechanical Manga frontend in `dist/web`. Its Overview, Judge Demo, Campaign, Progress, Reward, Architecture, and Evidence routes expose the three core client screens, read CampaignConfig/UserProgress/Reward accounts from the configured Devnet RPC, compute exact lock reasons, and submit the fixed `claim_reward` instruction only after wallet signing and finalized account refetch.

The issuer CLI is `node cli/builderloop.js`; run it without arguments for its localnet campaign, attestation, verifier, and reward commands.
