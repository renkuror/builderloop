# BuilderLoop

**Heartbeat-normalized on-chain loyalty for Solana.**

Every product has its own natural rhythm. A daily game, weekly protocol, and monthly community should not be judged by one global activity rule. BuilderLoop lets a project commit a fixed **Project Heartbeat**, verify meaningful activity, and maintain a reusable wallet loyalty state relative to that cadence.

> Different systems prove activity. BuilderLoop measures whether a wallet keeps returning at the project’s rhythm.

## Live Devnet

- Frontend: [builderloop-tan.vercel.app](https://builderloop-tan.vercel.app/)
- BuilderLoop program: [`3mK8…PL4Q2`](https://explorer.solana.com/address/3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2?cluster=devnet)
- CohortBuild reference adapter: [`BwT8…ckWAF`](https://explorer.solana.com/address/BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF?cluster=devnet)
- Heartbeat policy: [`7Szb…ccGkE`](https://explorer.solana.com/address/7Szb6pAR42dq3yuwuhiEQoKLPWbTDhW2uLkq6mVccGkE?cluster=devnet)
- Demo loyalty state: [`FsPt…9WhgN`](https://explorer.solana.com/address/FsPtJM452w4FTxdvCUiGf5xfwG3JfFeAhcH2Lcb9WhgN?cluster=devnet)

All public-chain links target **Devnet**. Mainnet is out of scope.

## How it works

```text
immutable Project Heartbeat
        ↓
verified meaningful activity
        ↓
wallet-bound LoyaltyState
        ↓
lazy Clock decay · streak · tier
        ↓
reward / access / benefit consumer
```

1. A campaign creates an immutable `LoyaltyConfig` with a heartbeat, minimum return interval, scoring policy, tier thresholds, and verifier.
2. An allowlisted verifier signs a domain-separated activity proof for a specific wallet and event.
3. BuilderLoop verifies the Ed25519 instruction, prevents replay with an `ActivityReceipt`, and rejects activity inside the configured return interval.
4. `LoyaltyState` settles score and streak using Solana Clock. Decay is O(1): no keeper or daily transaction is required.
5. A consumer, currently a fixed-SPL `LoyaltyRewardGate`, reads effective loyalty on-chain before allowing a claim.

The score is bounded to `0..1000`. Repeated activity cannot substitute for returning: only one credit is available after the policy’s minimum return interval.

## Real Devnet evidence

| Proof | Devnet transaction |
| --- | --- |
| Immutable Heartbeat policy | [create policy](https://explorer.solana.com/tx/3YEgqS8hUGMee1q33gLyVBGsBX5oSEsACNmyw6RR3siU7qFjVQZLtBfqhuUUpx7U5JXEP4RxUrdY2jc3wyMuk8RZ?cluster=devnet) |
| First verified activity | [record activity](https://explorer.solana.com/tx/gSdpoBB1N69UqCUr6C6oUiiKcHDCnqGoNYwnQzxv92LFjmdTuim8HnafNAoFhzrWPm1fmwWdnWXY1VKQUcLjGY7?cluster=devnet) |
| Second valid return | [streak progression](https://explorer.solana.com/tx/MfazZMryoE2gZUxuzJKvh4v6AbwVTcDmMe2GzoTRNpzp8HF1MznSD9nnHApFnjqboCgbacZFUykDMs8rE29kzVP?cluster=devnet) |
| Loyalty-gated reward | [fixed SPL claim](https://explorer.solana.com/tx/K8piABoycNFiZafsshP13wMwa8vWW7hme56PUSrPJbqwqfaV37DFMqHaBUfLj7RFtavTj4EQ4PbZcKnBLpgZE89?cluster=devnet) |
| CohortBuild reference flow | [Module finalization](https://explorer.solana.com/tx/2Bp2tzGwmrzxXjEyomqWzMjECKifVHAqvK2b4K622KvBFuHnS6EfFkKzo9cmfxUR8f8LTTwS5wJcoZzkHfFPXne9?cluster=devnet) · [native CPI → Shipped](https://explorer.solana.com/tx/5YknRqK7vDviFqNf4Lq9ogw8MSDyJ6eSQ6VLNotzBZ7oLDk3uCdE1sj79VHzhcfZteyTFxpFbP7HzrwaC7vUkHdP?cluster=devnet) |

The public demo uses a deliberately short 20-second heartbeat and 15-second return interval so Clock behavior can be reproduced on Devnet. It is a verification fixture, not a production cadence recommendation.

## What is on-chain

- Immutable heartbeat policy and deterministic config hash
- Wallet-bound score, streak, activity count, and policy epoch
- Ed25519 activity-proof verification and replay protection
- Minimum-return anti-burst rule
- Constant-time lazy decay and tier derivation
- Loyalty-gated, fixed-amount SPL reward settlement

## Trust boundaries

BuilderLoop verifies provenance, cadence, wallet binding, policy binding, replay protection, and consumer eligibility. The configured verifier (or a future native source-program adapter) still defines what counts as meaningful activity.

BuilderLoop does **not** claim Sybil resistance, proof of personhood, automatic activity semantics for arbitrary protocols, autonomous heartbeat analytics, or external adoption.

## CohortBuild reference adapter

The original `Module → Return → Ship → Reward` flow remains supported as a reference native adapter. It demonstrates that a source program can verify its own outcome and send it to BuilderLoop through CPI. Heartbeat Loyalty is additive: existing `CampaignConfig`, `UserProgress`, and legacy reward accounts are not reinterpreted or migrated.

## Repository map

- `programs/builderloop` — Anchor program and Heartbeat Loyalty instructions
- `programs/cohort-build` — reference source-program adapter
- `crates/protocol-core` — shared fixed-width serialization and scoring helpers
- `web` — Mechanical Manga frontend
- `scripts` — Devnet evidence, verification, build, and safety tooling
- `tests` / `test` — Anchor, protocol, and frontend tests
- `deployments` and `evidence` — public Devnet addresses and transaction metadata

## Verify locally

```sh
pnpm install --frozen-lockfile
pnpm run ci
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
NO_DNA=1 anchor build
NO_DNA=1 anchor test --skip-build
pnpm secrets
pnpm devnet:verify
pnpm heartbeat:verify
```

Build the static frontend with `pnpm frontend:build` and serve it with `pnpm frontend:serve`.

## Scope

The MVP supports a configured, immutable heartbeat. Forward-only heartbeat epochs, analytics-derived cadence, broader native adapters, relative tiers, and additional consumers are future work.
