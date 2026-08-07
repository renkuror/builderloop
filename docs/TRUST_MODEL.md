# Trust Model

BuilderLoop separates **proving an activity** from **measuring return consistency**.

## Enforced by BuilderLoop

- A `LoyaltyConfig` binds a heartbeat policy to one frozen Campaign configuration, verifier identity/epoch, and deterministic policy hash.
- A wallet signs every activity and claim transaction.
- The immediately preceding Ed25519 proof is bound to the BuilderLoop program, policy, campaign, wallet, verifier, epochs, unique activity ID, metadata, and validity window.
- One `ActivityReceipt` PDA makes the event single-use; the minimum return interval rejects burst activity.
- Solana Clock determines effective score, streak reset, lazy decay, and reward eligibility.
- `LoyaltyRewardGate` snapshots the policy hash/epoch and threshold. A Claim is one PDA per Reward/wallet, uses the stored fixed amount, and transfers only to a same-mint token account owned by the signer.

## Trusted roles

- **Campaign authority:** chooses the legacy campaign and creates the one immutable heartbeat policy before its own configuration is frozen by PDA initialization.
- **Activity verifier:** decides whether an off-chain or external fact qualifies as meaningful activity and signs the fixed heartbeat voucher. It can attest only within its bound policy/wallet/epoch domain.
- **Reward authority:** funds and controls the existing Reward lifecycle. It cannot choose a claimant’s amount or bypass the loyalty threshold once its gate is created.
- **Native source program / adapter (future recurring ingress):** would define source semantics for a CPI path. CohortBuild is currently a reference completion adapter, not a recurring-heartbeat claimant.

## Explicit non-claims

BuilderLoop does not prove unique humans, Sybil resistance, economic significance of arbitrary transaction data, farming prevention across many wallets, organic retention, independent sponsorship, trustless off-chain verification, automatic heartbeat analytics, external adoption, or token value. A short Devnet heartbeat is evidence of deterministic Clock behavior only.

For a single centralized product with no composability or shared reward need, a database may be simpler. BuilderLoop’s value is public, reusable state when multiple wallets, programs, or reward issuers need the same inspectable loyalty result.
