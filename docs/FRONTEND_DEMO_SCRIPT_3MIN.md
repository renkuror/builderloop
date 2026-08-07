# BuilderLoop Three-Minute Demo Script

> Historical fixture-recording script. The current public Devnet workflow and evidence are documented in [DEVNET_RELEASE_REPORT.md](../DEVNET_RELEASE_REPORT.md) and [docs/DEVNET_RUNBOOK.md](DEVNET_RUNBOOK.md).

## Use and evidence status

This extended script explains the protocol and its client surface without turning prepared UI into false network proof. **Final recording is pending.** The default path is a no-wallet local fixture marked **DEMO FIXTURE — NOT LIVE**; the optional connected panel is **LIVE LOCAL VALIDATOR**, not Devnet.

## Time-coded script

| Time | Screen / action | Narration |
| --- | --- | --- |
| 0:00–0:18 | `/` — headline, hero, Return Rail preview. | “Points cannot substitute for return. BuilderLoop freezes an ordered Module, Return Gate, Ship, and Reward path on-chain for one campaign. The core question is not whether an activity occurred once; it is whether the same wallet returns later and completes the committed project.” |
| 0:18–0:35 | `/` — contrast manual vs BuilderLoop panels. | “The manual flow can collect a one-off proof and credit points. BuilderLoop fixes the eligibility configuration, records a verifier-attested Module, enforces time and period gaps, validates a source Completion, and settles one fixed SPL claim.” |
| 0:35–0:48 | Select **OPEN JUDGE DEMO**. | “The judge path is readable without a wallet. It is explicitly labeled DEMO FIXTURE — NOT LIVE. It exposes prepared local evidence, not public transaction links.” |
| 0:48–1:08 | `/demo/?scenario=pending-module` — Return Rail and proof drawer. | “First, Module. The receipt binds the campaign, wallet, canonical event, and project commitment. A receipt can be pending while the verifier challenge delay runs. Pending Module never unlocks Ship or Reward.” |
| 1:08–1:29 | `/demo/?scenario=early-ship` — Return Gate and raw error. | “Second, Return Gate. This campaign fixture requires a finalized Module, at least 120 seconds of elapsed time, and a two-period gap. The early Ship scenario stops at the gate. It gives both a human-readable reason and the underlying local error detail.” |
| 1:29–1:51 | `/progress/?scenario=shipped` — Ship evidence. | “Third, Ship. The completion must be from the same wallet and committed project. BuilderLoop validates the configured source program, source authority, account type, challenge, owner, and PDA before accepting the CohortBuild native CPI. The fixture shows the account model; it does not claim an Explorer transaction.” |
| 1:51–2:15 | `/reward/?scenario=shipped` — fixed payout conditions. | “Fourth, Reward. The Reward account snapshots the frozen configuration and fixes the amount. The user cannot supply a payout amount. A claim requires a signer-owned recipient token account using the reward mint, and one Claim PDA prevents a second claim.” |
| 2:15–2:30 | `/reward/?scenario=claimed` — **SHOW DUPLICATE REJECTION**. | “This control exposes the prepared duplicate-claim result. It is not a wallet signature or token transfer. The claimed fixture makes duplicate protection visible: a second claim is rejected because the Claim PDA already exists.” |
| 2:30–2:43 | `/campaign/` — frozen config and trust disclosure. | “The campaign authority configures before freeze. After freeze, eligibility-critical identities and the config hash are immutable. The verifier and source semantics are disclosed trust boundaries, not hidden claims of independent verification.” |
| 2:43–2:53 | `/architecture/` — static blueprint. | “The architecture shows CampaignConfig, UserProgress, ModuleReceipt, the CohortBuild source accounts, Reward and Claim, and the SPL Token vault. These are static technical panels, not fake buttons.” |
| 2:53–3:00 | `/evidence/` — repository and caveat. | “The public repository and local test evidence are available here. The limitation is explicit: this repository has localnet evidence only. Devnet deployment and Devnet transaction links are not produced.” |

## Optional local-validator insert

Only insert this after a genuine local setup is working. On `/progress/` or `/reward/`, show **LIVE LOCAL VALIDATOR**, enter genuine local addresses, and use **CONNECT LOCAL WALLET**. Narrate: “This is a local validator path. The UI reports success only after finalization, account refetch, and account-state verification.” Do not show or imply an Explorer link, and omit the segment if it cannot be run cleanly.

## Narration guardrails

- Say “prepared fixture,” “local validator,” and “localnet evidence” exactly where they apply.
- Do not say “live Devnet,” “production,” “unfarmable,” “Sybil-resistant,” “proof of human,” “independent sponsor,” or “organic retention.”
- Do not turn a design state into a transaction claim. Real action success requires wallet signature, submission, confirmation, finalization, refetch, and verified account state.
