# BuilderLoop

BuilderLoop is a heartbeat-normalized on-chain loyalty layer: verified meaningful activity maintains a wallet’s reusable loyalty state at the cadence a project defines.

## Why one loyalty clock does not fit every product

A daily game, a weekly DeFi protocol, and a monthly community have different natural return rhythms. A single global rule such as “interact every 30 days” rewards the wrong behavior for all three. BuilderLoop lets a project freeze a **Project Heartbeat**, then measures consistent returns relative to that project-specific clock.

Different systems prove the activity; BuilderLoop measures whether the wallet keeps returning at the rhythm expected by the project.

## Project Heartbeat

The new additive Heartbeat Loyalty accounts do not reinterpret any deployed legacy account:

```text
immutable LoyaltyConfig (project heartbeat + verifier + score policy)
                 ↓
verifier-signed meaningful activity / one-use ActivityReceipt
                 ↓
wallet-bound LoyaltyState
                 ↓
effective score, tier, streak, and lazy Clock decay
                 ↓
LoyaltyRewardGate → fixed SPL Reward / Claim
```

For the MVP the heartbeat is configured and immutable. Analytics-derived updates, percentile tiers, and generic adapters are roadmap work—not implemented claims.

## Live Devnet demo

The existing public site is [builderloop-tan.vercel.app](https://builderloop-tan.vercel.app/). Until this branch is merged and deployed, that URL serves the prior reference-adapter release rather than claiming Heartbeat Loyalty as live.

The Heartbeat demo is now real, public Devnet evidence:

- [LoyaltyConfig](https://explorer.solana.com/address/7Szb6pAR42dq3yuwuhiEQoKLPWbTDhW2uLkq6mVccGkE?cluster=devnet) · [LoyaltyState](https://explorer.solana.com/address/FsPtJM452w4FTxdvCUiGf5xfwG3JfFeAhcH2Lcb9WhgN?cluster=devnet)
- [Immutable policy creation](https://explorer.solana.com/tx/3YEgqS8hUGMee1q33gLyVBGsBX5oSEsACNmyw6RR3siU7qFjVQZLtBfqhuUUpx7U5JXEP4RxUrdY2jc3wyMuk8RZ?cluster=devnet)
- [First verified activity](https://explorer.solana.com/tx/gSdpoBB1N69UqCUr6C6oUiiKcHDCnqGoNYwnQzxv92LFjmdTuim8HnafNAoFhzrWPm1fmwWdnWXY1VKQUcLjGY7?cluster=devnet)
- [Second valid return](https://explorer.solana.com/tx/MfazZMryoE2gZUxuzJKvh4v6AbwVTcDmMe2GzoTRNpzp8HF1MznSD9nnHApFnjqboCgbacZFUykDMs8rE29kzVP?cluster=devnet)
- [Loyalty-gated fixed SPL claim](https://explorer.solana.com/tx/K8piABoycNFiZafsshP13wMwa8vWW7hme56PUSrPJbqwqfaV37DFMqHaBUfLj7RFtavTj4EQ4PbZcKnBLpgZE89?cluster=devnet)

The demo command creates only public Devnet accounts and records the resulting real addresses and signatures:

```sh
NO_DNA=1 pnpm heartbeat:demo
NO_DNA=1 pnpm heartbeat:verify
```

It intentionally uses a short **20-second heartbeat** and a **15-second minimum return interval** solely for reproducible Devnet Clock evidence. That configuration is not a production cadence recommendation. `deployments/devnet.json` is the source of the actual public URLs; no fixture score is labeled live by the frontend.

## How loyalty works

Scores are bounded to `0..1000`. For a valid new meaningful activity:

1. BuilderLoop derives the current effective score from `LoyaltyState`, `LoyaltyConfig`, and Solana Clock.
2. It rejects activity inside `minimum_return_interval`; repeated activity cannot farm score or streak.
3. It applies O(1) lazy decay for elapsed heartbeat periods, continues or resets the streak, adds the fixed activity credit plus capped streak bonus, and clamps at 1000.
4. It writes the settled state and a replay-resistant `ActivityReceipt` PDA.

With heartbeat `H`, elapsed periods are `floor((now - last_activity) / H)` and missed periods are `max(elapsed - 1, 0)`. Effective score is `max(0, stored_score - missed_periods × decay)`. No keeper or daily settlement transaction is needed.

The default demo policy is: +300 activity credit, +50 per streak step capped at four steps, −200 per missed heartbeat, with Bronze/Silver/Gold/Platinum thresholds at 0/300/600/850. The exact frozen values are decoded from the public `LoyaltyConfig` rather than hard-coded by the UI.

## Meaningful activity verification

### Ed25519 attestation

`record_verified_activity` requires an immediately preceding Ed25519 instruction. Its fixed-width, domain-separated message binds the BuilderLoop program ID, LoyaltyConfig, campaign, wallet, configured verifier and epoch, policy epoch, activity kind, unique event hash, metadata hash, and validity window. The program rejects the wrong verifier, wallet, policy, domain, expiry, malformed precompile offsets, and replayed event.

### Native CPI adapters

Another Solana program can prove a fact through a native BuilderLoop adapter. BuilderLoop then applies its own heartbeat policy to the verified fact. The MVP ships the signed-verifier recurring ingress; a recurring native loyalty adapter is deliberately future work.

### CohortBuild reference adapter

The existing `Module → Return → Ship` flow remains live and unchanged as a reference integration: CohortBuild validates a user-bound Completion then performs a native CPI into BuilderLoop. It demonstrates the source-program half of the model, but it is no longer the definition of BuilderLoop’s product.

## Lazy decay and LoyaltyState

`LoyaltyState` is persistent, wallet-bound public state. It stores the score at the last settlement, last meaningful-activity timestamp, streak, activity count, policy epoch, and PDA bump—not an unbounded history. Clients and consumers derive the current score/tier using the same deterministic integer formula. This is not a claim of Sybil resistance or unique-human identity.

## Loyalty-gated reward

`LoyaltyRewardGate` snapshots a policy hash/epoch and a minimum effective score and tier while the legacy Reward is still Draft. `claim_loyalty_reward` derives the current state from Clock, enforces the frozen threshold, uses the existing one-Claim-PDA-per-reward/wallet rule, and transfers only the fixed amount already stored in the Reward vault. A claimant never supplies its payout amount.

## Architecture

Read [Heartbeat Loyalty](docs/HEARTBEAT_LOYALTY.md), [architecture](docs/ARCHITECTURE.md), [trust model](docs/TRUST_MODEL.md), [threat model](docs/THREAT_MODEL.md), and [why Solana](docs/WHY_SOLANA.md).

## Existing Module → Return → Ship adapter

The deployed legacy account layouts and instruction semantics remain compatible:

```text
verifier-attested Module
→ challenge delay / real Clock period gap
→ same-wallet CohortBuild Completion CPI
→ Shipped UserProgress
→ pre-funded fixed SPL Reward / Claim
```

Heartbeat Loyalty uses new PDAs and new instructions only. It does not require migration, reinterpret `CampaignConfig`/`UserProgress`, modify `record_native_ship`, or alter `claim_reward`.

## Security invariants

- Heartbeat policy is a separate immutable PDA and has a deterministic policy hash.
- A verifier-signed activity is campaign-, wallet-, policy-, epoch-, and program-bound.
- An `ActivityReceipt` makes an event single-use; a minimum return interval blocks burst farming.
- Score math is bounded, checked, constant-time in missed periods, and derived from Solana Clock.
- Loyalty claims require a wallet-bound state, frozen policy snapshot, fixed threshold, fixed Reward amount, same-mint signer-owned recipient, and unique Claim PDA.
- Mainnet is forbidden. Devnet evidence uses public addresses/signatures only; no role secret is committed or shipped to the frontend.

## What is enforced on-chain

BuilderLoop enforces activity provenance from an allowlisted verifier, policy binding, replay protection, cadence timing, score/tier derivation, wallet binding, threshold eligibility, and fixed SPL settlement.

## What remains trusted

The configured verifier (or a future source-program adapter) defines what “meaningful” means. Campaign authorities choose a policy before freezing it; reward authorities fund their reward lifecycle. BuilderLoop does not prove a transaction was economically meaningful by itself, unique people, Sybil resistance, organic retention, independent sponsorship, external adoption, or autonomous heartbeat analytics.

## Devnet programs and historical evidence

- [BuilderLoop Devnet program](https://explorer.solana.com/address/3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2?cluster=devnet)
- [CohortBuild Devnet program](https://explorer.solana.com/address/BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF?cluster=devnet)
- [Historical Module finalization](https://explorer.solana.com/tx/2Bp2tzGwmrzxXjEyomqWzMjECKifVHAqvK2b4K622KvBFuHnS6EfFkKzo9cmfxUR8f8LTTwS5wJcoZzkHfFPXne9?cluster=devnet)
- [Historical CohortBuild native CPI → Shipped](https://explorer.solana.com/tx/5YknRqK7vDviFqNf4Lq9ogw8MSDyJ6eSQ6VLNotzBZ7oLDk3uCdE1sj79VHzhcfZteyTFxpFbP7HzrwaC7vUkHdP?cluster=devnet)
- [Historical fixed SPL reward claim](https://explorer.solana.com/tx/4amsThi4sYufPZr2vNVpWYyk4LjoBEznSfC44PapphfqTpwxEUXiQQc7SmxfxJNTnUsgxo1RN1kf42PstZtJTAB4?cluster=devnet)

The old transactions remain historical evidence for the CohortBuild adapter. New Heartbeat evidence is added only by the guarded Devnet demo, never fabricated in documentation.

## Tests

```sh
pnpm run ci
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
NO_DNA=1 anchor build
NO_DNA=1 anchor test --skip-build
pnpm secrets
pnpm devnet:verify          # historical reference-adapter evidence
pnpm heartbeat:verify       # after a Heartbeat Devnet demo exists
```

The pure Rust and JavaScript suites share fixed heartbeat config/activity hash vectors and transition vectors. The Anchor suite exercises both the legacy flow and the new verifier activity, anti-burst, lazy decay, tier, and gated-claim path.

## Local reproduction

```sh
scripts/prepare-localnet.sh
pnpm install --frozen-lockfile
NO_DNA=1 anchor build
NO_DNA=1 anchor test --skip-build
pnpm run ci
pnpm frontend:build
pnpm frontend:serve
```

For guarded Devnet deployment and evidence, follow [docs/DEVNET_RUNBOOK.md](docs/DEVNET_RUNBOOK.md). The runbook validates the Devnet genesis hash and refuses a non-Devnet RPC before sending transactions.

## Known limitations

- The implemented heartbeat is configured/fixed, not automatically analytics-adaptive.
- Verifier-signed activity has a disclosed verifier trust boundary.
- The MVP has no Sybil resistance, relative leaderboard, universal reputation, or generic adapter marketplace.
- The current public production URL will only become heartbeat-first after the branch deployment is promoted.

## Roadmap

Forward-only heartbeat epochs with bounded changes, native recurring adapters, additional LoyaltyState consumers (access, discounts, allowlists), and indexed cohort-level retention analytics are possible extensions. They are not part of this release.

## License

No license file is currently included in this repository.
