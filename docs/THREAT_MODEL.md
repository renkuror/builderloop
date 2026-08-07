# Threat Model

## Heartbeat Loyalty defenses

| Threat | On-chain defense |
| --- | --- |
| Wallet invents activity | `record_verified_activity` requires a strict, immediately preceding Ed25519 instruction from the configured verifier. |
| Reuse an event | `ActivityReceipt` PDA includes LoyaltyConfig, wallet, and activity ID hash; a second initialization fails. |
| Move a valid proof to another wallet/campaign/policy | Fixed message bytes bind BuilderLoop ID, LoyaltyConfig, campaign, wallet, verifier/epoch, and policy epoch. |
| Use a stale/malformed proof | Expiry, maximum voucher lifetime, policy activation time, verifier epoch, exact offsets/indexes, signature count, and message bytes are checked. |
| Burst ten activities in one session | `now - last_meaningful_activity_at >= minimum_return_interval` is required before any new receipt or credit; early activity fails. |
| Make inactivity expensive to settle | Lazy decay uses a constant-time multiplication over elapsed periods; no per-period loop or keeper exists. |
| Overflow/underflow score | Policy validation bounds a single credit to 1000, score is clamped to `0..1000`, and time/multiplication arithmetic is checked/saturating as appropriate. |
| Change cadence after wallets earn state | No policy update instruction exists. `LoyaltyConfig` is a separate immutable PDA with a deterministic hash. |
| Claim a loyalty benefit without eligibility | `claim_loyalty_reward` derives effective score/tier from Clock and checks a frozen gate snapshot. |
| Change reward amount or recipient | Reward stores fixed amount/mint/vault; recipient must be a signer-owned same-mint account; Claim PDA is unique. |
| Break old flows via account migration | Legacy account layouts and `record_native_ship`/`claim_reward` instruction semantics are unchanged. |

## Threats outside this MVP’s security claim

- A malicious or compromised configured verifier can attest false activities in its allowed scope. It cannot forge another verifier, change the policy, skip wallet signatures, reuse a receipt, or select a reward amount.
- Many wallets can still farm per-wallet loyalty: there is no Sybil or proof-of-personhood mechanism.
- A project can choose a poorly calibrated heartbeat before policy creation. The fixed policy makes the choice transparent but does not make it wise.
- A tiny swap or self-generated interaction can qualify only if a verifier or source adapter treats it as meaningful. BuilderLoop intentionally does not infer all application semantics.
- Relative top-percent tiers, activity analytics, and automatic heartbeat adjustment require indexed/off-chain data and are not implemented.
- Devnet operations remain subject to public RPC and test-token availability; Mainnet is out of scope and forbidden.

## Legacy reference path

The existing Module → Return → Ship path continues to defend frozen campaign eligibility, one-time Module event replay, Clock period gap, same-wallet/project native Completion, source program/authority/layout binding, fixed reward amount, and recipient-bound SPL settlement. Those existing invariants are preserved rather than repurposed as loyalty assertions.
