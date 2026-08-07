# BuilderLoop Frontend Voiceover Guide

> Historical fixture voiceover guide. For the current public Devnet release, use [DEVNET_RELEASE_REPORT.md](../DEVNET_RELEASE_REPORT.md) and [docs/DEVNET_RUNBOOK.md](DEVNET_RUNBOOK.md).

## Read-this-first disclosure

These lines are approved only for the historical localnet/fixture recording checkpoint. **They are not current production-release narration.** Do not replace **DEMO FIXTURE — NOT LIVE** with a softer phrase, and do not narrate a fixture control as a signature, transfer, or public confirmation. Use [PUBLIC_RELEASE_AUDIT.md](../PUBLIC_RELEASE_AUDIT.md) for current Devnet evidence.

## Core 15-second explanation

> BuilderLoop turns a cohort reward into an ordered return path: a verifier-attested Module, a campaign-defined return gate, a same-wallet same-project Ship, then one fixed SPL reward. The public demo is a prepared fixture, not a live network claim.

## Route voiceover lines

| Route | Safe narration |
| --- | --- |
| `/` | “Points cannot substitute for return. BuilderLoop makes eligibility depend on an ordered path, not a single activity.” |
| `/demo/` | “This read-only judge path is labeled DEMO FIXTURE — NOT LIVE. It lets us inspect the state machine without requiring a wallet.” |
| `/campaign/` | “Eligibility-critical configuration is frozen after campaign freeze. The verifier and source authority are disclosed roles in this fixed campaign.” |
| `/progress/` | “Ship is wallet-bound and project-bound. The program evaluates elapsed time, period gap, and source Completion validation rather than accepting a client claim.” |
| `/reward/` | “The reward amount is fixed by the Reward account. A claim needs a matching signer-owned recipient account, and a Claim PDA prevents duplicate settlement.” |
| `/architecture/` | “CohortBuild serializes its Completion and invokes BuilderLoop through a native CPI. The source accounts and SPL vault are part of the program boundary.” |
| `/evidence/` | “The public repository and local tests are linked here. Local test evidence is not Devnet evidence; Devnet deployment and transaction links are not produced.” |

## State-specific lines

### Pending Module

> The verifier-attested Module has not finalized. Because the receipt is pending, the Return Gate, Ship, and Reward remain locked.

### Early Ship rejection

> The Module is finalized, but the campaign still rejects Ship. Both the elapsed-time rule and the discrete-period gap must pass; the proof drawer keeps the raw error visible.

### Shipped / claimable fixture

> This prepared state represents the allowed order: the same wallet returns after the gate and Ships the committed project before reward eligibility. It is a fixture, not a transaction receipt.

### Reward claimed fixture

> This prepared state represents a claim that already has a Claim PDA. A second claim is rejected by the one-claim-per-reward-and-wallet rule. Fixture playback does not transfer a token.

## Local wallet line

> LIVE LOCAL VALIDATOR is optional. When used, the client treats success as verified only after wallet signature, submission, confirmation, finalization, account refetch, and account-state verification.

## Phrases to avoid

| Do not say | Why |
| --- | --- |
| “This is live on Devnet.” | No Devnet deployment/evidence exists in the current repository. |
| “This claim just transferred tokens.” | **PLAY FIXTURE CLAIM** is fixture playback. |
| “BuilderLoop prevents farming/Sybil attacks.” | The MVP makes no Sybil-resistance or farming-prevention claim. |
| “An independent sponsor verified this.” | No public evidence supports that claim. |
| “These are transaction links.” | No Devnet transaction links were produced; local signatures are ephemeral. |
| “Retention is proven.” | The system demonstrates a gated mechanism, not organic-retention evidence. |
