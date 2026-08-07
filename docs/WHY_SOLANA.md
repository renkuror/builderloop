# Why Solana

BuilderLoop is not an argument that every loyalty program belongs on-chain. A single centralized application with one private reward system may be simpler and cheaper with a database.

The on-chain design is useful when a project wants a shared, inspectable loyalty primitive:

- `LoyaltyState` is a public wallet-bound account that another Solana program can read or consume without trusting BuilderLoop’s private database.
- Solana Clock gives activity verifiers, users, and consumers one common temporal reference for heartbeat windows and lazy decay.
- Source programs can prove outcomes through CPI rather than BuilderLoop needing to understand their whole application.
- PDAs provide public, deterministic replay protection for activity receipts and one-claim settlement.
- A frozen policy hash makes the heartbeat, thresholds, and verifier binding inspectable before rewards are consumed.
- Loyalty-gated fixed SPL settlement can happen atomically with its eligibility check.

The current implementation demonstrates a verifier-signed recurring ingress and a legacy CohortBuild native completion CPI. The latter is a reference adapter pattern; a generic native recurring adapter surface is intentionally not claimed yet.

Solana does not remove the trust boundary around external activity semantics. BuilderLoop makes that boundary explicit while making the resulting cadence-normalized state composable.
