# BuilderLoop Architecture

BuilderLoop now has two compatible layers:

```text
Heartbeat Loyalty core (primary)
  LoyaltyConfig → verified activity → LoyaltyState → consumer

CohortBuild reference adapter (preserved)
  Module → Clock return gate → native Completion CPI → Shipped → Reward
```

## Heartbeat Loyalty core

`programs/builderloop` owns four new additive PDAs:

- `LoyaltyConfig`: fixed campaign-bound heartbeat policy, verifier identity/epoch, score parameters, tier thresholds, activation time, and deterministic hash.
- `LoyaltyState`: a wallet-bound settled score, activity timestamp, streak, counted activity count, and policy epoch.
- `ActivityReceipt`: one verifier-attested activity ID per config/wallet for replay resistance.
- `LoyaltyRewardGate`: frozen policy hash/epoch and score/tier threshold for an existing Reward.

`record_verified_activity` uses the same strict prior Ed25519 instruction inspection pattern as the legacy Module path, but a separate `BUILDERLOOP_HEARTBEAT_ACTIVITY_V1` domain and receipt namespace. It verifies provenance, wallet binding, policy epoch, expiry, and canonical message bytes. An activity before `minimum_return_interval` fails; it does not create credit.

The program does not mutate inactive wallets. `effective_loyalty_state` derives score and tier from `LoyaltyState`, `LoyaltyConfig`, and `Clock` in constant time. A later qualifying activity writes the accumulated decay and next credit. The browser uses the same integer formula for its read-only display, backed by fixed cross-language vectors.

`claim_loyalty_reward` is the first consumer. The gate snapshots `LoyaltyConfig.config_hash` and policy epoch before a Draft legacy Reward activates. Claim checks the effective score and tier, then uses the existing Reward-owned classic SPL vault and `[claim, reward, wallet]` uniqueness PDA. Existing `claim_reward` stays unchanged.

## Legacy CohortBuild reference adapter

`CampaignConfig`, `UserProgress`, `ModuleReceipt`, `Reward`, and `Claim` retain their exact serialized layouts and semantics. `programs/cohort-build` retains its Challenge, BuildSubmission, Completion, source-authority PDA, and native CPI to `record_native_ship`.

The legacy flow proves an integration pattern:

```text
external verifier → Module receipt → Clock gates
→ CohortBuild validates a user/project Completion
→ native CPI → BuilderLoop validates source layout/PDA/authority
→ fixed Reward claim
```

It is not changed into a recurring activity source. A future CohortBuild heartbeat adapter would use a new instruction/account surface rather than extending the old CPI accounts.

## Shared protocol helpers

`crates/protocol-core` implements fixed-width heartbeat-policy and activity bytes, deterministic hashes, score/tier transitions, and O(1) lazy decay. `src/loyalty.js` implements the same public client/reference logic. Rust and JavaScript tests assert identical fixed vectors for policy and activity bytes/hashes, activity credit, decay, tier boundary, and next-decay calculations.

## Compatibility and upgrade boundaries

The BuilderLoop program ID remains `3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2`. An upgrade adds new instructions and accounts only; no existing Devnet account must deserialize under a changed layout and historical evidence remains historical evidence. Deployment is Devnet-only and only when its upgrade authority is available.
