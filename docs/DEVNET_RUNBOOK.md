# BuilderLoop Devnet Runbook

Mainnet is forbidden. This runbook performs only Devnet validation, Devnet program upgrades, and Devnet test-token evidence.

## Audited identities

- BuilderLoop: [`3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2`](https://explorer.solana.com/address/3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2?cluster=devnet)
- CohortBuild: [`BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF`](https://explorer.solana.com/address/BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF?cluster=devnet)

Use the dedicated keypair outside the repository. Never copy its bytes, a seed phrase, verifier key, or reward authority secret into Git, logs, public config, or frontend assets.

```sh
solana config set --url devnet --keypair ~/.config/solana/builderloop-devnet.json --commitment confirmed
solana config get
solana balance --url devnet
solana program show 3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2 --url devnet
solana program show BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF --url devnet
```

Stop if the cluster/RPC/genesis is not Devnet or if the BuilderLoop upgrade authority is unavailable. Do not switch to Mainnet as a workaround.

## Build and upgrade

The Heartbeat change adds instructions and new PDAs while preserving existing program IDs and legacy account layouts.

```sh
NO_DNA=1 anchor build
NO_DNA=1 anchor test --skip-build
solana config get
NO_DNA=1 anchor deploy --program-name builderloop \
  --provider.cluster devnet \
  --provider.wallet ~/.config/solana/builderloop-devnet.json \
  --program-keypair target/deploy/builderloop-keypair.json
solana program show 3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2 --url devnet
```

CohortBuild does not need an upgrade for the P0 heartbeat ingress. Its existing deployment remains the reference native completion adapter. Do not deploy it unless a checked source change actually requires it.

## Heartbeat evidence lifecycle

The guarded script validates the deployed program accounts, Devnet URL, and Devnet genesis hash before every transaction. It creates fresh public test roles in memory, never writes their secrets, and records only public identifiers/signatures.

```sh
NO_DNA=1 pnpm heartbeat:demo
NO_DNA=1 pnpm heartbeat:verify
```

The real Devnet demo creates:

1. a frozen legacy Campaign and immutable `LoyaltyConfig`;
2. a fixed 20-second heartbeat / 15-second minimum-return test policy;
3. first verifier-signed meaningful activity and `LoyaltyState`;
4. a rejected early activity proof (recorded as local/script evidence, not a fabricated failed public transaction);
5. a second valid return reaching the configured Gold tier;
6. a real Clock-based lazy-decay observation after two heartbeat periods;
7. a Draft Reward plus frozen `LoyaltyRewardGate`;
8. a rejected insufficient-loyalty claim, then a successful loyalty-gated fixed SPL test-token claim and rejected duplicate proof.

The command updates only public data in:

- `deployments/devnet.json`
- `evidence/devnet-addresses.json`
- `evidence/transaction-links.json`

`pnpm heartbeat:verify` recomputes the policy hash, validates PDA graphs and raw account layouts, re-derives score/decay, checks public transaction success and Explorer URLs, validates token account bindings, and rejects Mainnet references.

## Historical CohortBuild evidence

The existing flow remains independently verifiable:

```sh
NO_DNA=1 pnpm devnet:verify
```

This verifies the existing Module finalization, native CohortBuild CPI → Shipped, and classic fixed SPL claim evidence. It is historical reference-adapter evidence, not Heartbeat Loyalty evidence.

## Public frontend configuration

`pnpm frontend:build` runs `scripts/build-devnet-config.js`. It exposes only public Devnet RPC/program/account/signature values. The frontend displays Heartbeat state as `LIVE DEVNET` only when a complete `heartbeatDemo` record exists and its accounts validate at runtime. Otherwise it explicitly says `DEMO FIXTURE — NOT LIVE` and does not manufacture a score, tier, or claim control.
