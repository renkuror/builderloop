# Heartbeat Loyalty MVP

BuilderLoop measures return consistency relative to a project-specific heartbeat. It does not label arbitrary wallet transactions as loyalty and it does not use a global interaction calendar.

## Primary primitive

```text
Project-specific fixed HeartbeatPolicy
        +
verified meaningful activity
        +
Solana Clock
        ↓
wallet-bound, reusable LoyaltyState
```

For the MVP, “HeartbeatPolicy” is the `LoyaltyConfig` PDA. It is immutable after creation. A project that needs a daily cadence and a project that needs a monthly cadence can deploy different policies without changing BuilderLoop’s score logic.

## Accounts

| Account | PDA | Purpose |
| --- | --- | --- |
| `LoyaltyConfig` | `[b"loyalty_config", campaign]` | Immutable campaign identity, campaign-config snapshot, authority, verifier/epoch, heartbeat, minimum return interval, score parameters, tier thresholds, activation time, deterministic hash, and bump. |
| `LoyaltyState` | `[b"loyalty_state", loyalty_config, wallet]` | Wallet binding, score at last settlement, last meaningful activity, streak, counted activity total, policy epoch, and bump. |
| `ActivityReceipt` | `[b"activity", loyalty_config, wallet, activity_id_hash]` | One-use, verifier-attested activity proof and the post-credit score/streak. |
| `LoyaltyRewardGate` | `[b"loyalty_reward_gate", reward]` | Frozen `LoyaltyConfig` hash/epoch and minimum score/tier required for a legacy `Reward`. |

No existing `CampaignConfig`, `UserProgress`, `Reward`, or `Claim` bytes change. The feature is additive.

## Instructions

- `create_loyalty_config(args)` creates one immutable policy only for a frozen/active campaign whose verifier is active.
- `record_verified_activity(voucher)` inspects an immediately preceding Ed25519 instruction, creates a one-use receipt, settles lazy decay, and credits qualifying activity.
- `create_loyalty_reward_gate(args)` snapshots a loyalty policy into a Draft legacy Reward.
- `claim_loyalty_reward()` derives current effective loyalty and performs the existing fixed-amount Claim settlement when the frozen threshold is met.

There is intentionally no periodic `settle` instruction or mutable policy updater.

## Verified activity message

`BUILDERLOOP_HEARTBEAT_ACTIVITY_V1` fixed-width bytes bind:

```text
domain || BuilderLoop program ID || LoyaltyConfig || campaign || wallet
|| configured verifier || verifier epoch || policy epoch || activity kind
|| unique activity ID hash || metadata hash || issued_at || expires_at
```

The program rejects expiry, voucher validity windows over one day, vouchers issued before policy activation, the wrong verifier/epoch/policy/wallet/domain/program, malformed Ed25519 instruction offsets, and reused activity receipt seeds.

## Cadence and anti-burst rule

Only one credit is possible when:

```text
now - last_meaningful_activity_at >= minimum_return_interval
```

An earlier activity is rejected, not stored as a non-crediting event. Therefore ten signed events today cannot replace returning in a later cadence window.

`minimum_return_interval` must be positive and no greater than the policy heartbeat. The user—not a server—is the transaction signer, while the verifier supplies the activity proof.

## Deterministic score model

Score is bounded to `0..1000`.

```text
elapsed_periods = floor((now - last_activity) / heartbeat)
missed_periods  = max(elapsed_periods - 1, 0)
effective_score = max(0, stored_score - missed_periods * decay_per_missed_period)
```

For a qualifying new activity:

```text
streak = prior streak + 1 if missed_periods == 0, otherwise 1
credit = active_credit + streak_bonus * min(streak, streak_bonus_cap)
stored_score = min(1000, effective_score + credit)
```

The formula uses checked/saturating integer operations and no loop over elapsed periods. Ten years of inactivity is O(1). A missed period resets the effective streak to zero before the next valid activity starts a new streak.

Tier is derived from frozen ordered thresholds: Bronze, Silver, Gold, Platinum. Tier does not add a separate mutable source of truth.

## Demo example

The Devnet verification policy deliberately uses a 20-second heartbeat and 15-second minimum return interval:

| Event | Result |
| --- | --- |
| First verified activity | streak 1, score 350, Silver |
| Repeated activity before 15 seconds | rejected; no score/streak change |
| Second verified activity at/after 15 seconds | streak 2, score 750, Gold |
| Two full heartbeat periods without activity | one missed period, effective score 550, effective streak 0, Silver |

This short setup is evidence-only. Production projects set real-world seconds such as daily, weekly, or monthly cadence.

## Consumer model

`claim_loyalty_reward` checks `LoyaltyState` and `LoyaltyRewardGate` at the current Clock timestamp. A low current effective score or tier cannot claim. A qualifying wallet receives the already-fixed SPL amount into a same-mint token account it owns. The pre-existing `[b"claim", reward, wallet]` PDA means the same wallet cannot claim twice through either legacy or loyalty route.

The same public state can later be consumed by access, discounts, allowlists, or another program. Those consumers are examples, not implemented assertions.

## Reference adapter

CohortBuild’s Module → Return → Ship native CPI remains intact. It is one strong proof that another Solana program can establish a source outcome for BuilderLoop. The released recurring ingress is the verifier-signed path; no claim is made that CohortBuild currently emits recurring heartbeat credits.
