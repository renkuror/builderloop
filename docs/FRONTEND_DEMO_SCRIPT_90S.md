# BuilderLoop 90-Second Demo Script

> Historical fixture-recording script. The current public Devnet workflow and evidence are documented in [DEVNET_RELEASE_REPORT.md](../DEVNET_RELEASE_REPORT.md) and [docs/DEVNET_RUNBOOK.md](DEVNET_RUNBOOK.md).

## Use and evidence status

This script is for the final recording. **Recording status: pending.** It assumes the prepared no-wallet fixture path and must never be voiced as a live Devnet transaction. Keep **DEMO FIXTURE — NOT LIVE** visible whenever fixture data is on screen.

## Time-coded script

| Time | Screen / action | Narration |
| --- | --- | --- |
| 0:00–0:10 | `/` — show headline and Return Rail preview. | “BuilderLoop is an ordered return-reward path for Solana cohorts. A wallet completes a verified Module, returns after the campaign gate, Ships the committed project, then becomes eligible for one fixed reward.” |
| 0:10–0:18 | Point to **OPEN JUDGE DEMO** and open `/demo/`. | “This public judge path works without a wallet. The label is deliberate: DEMO FIXTURE — NOT LIVE.” |
| 0:18–0:31 | Select `Pending Module`; select **MODULE** and **RETURN GATE**. | “A verifier-attested Module can still be pending. Until it finalizes, the Return Gate stays locked and Ship cannot begin.” |
| 0:31–0:45 | Select `Early Ship rejection`; open raw detail. | “A finalized Module is not enough. This fixture shows an early Ship rejection: both the 120-second elapsed-time gate and the two-period gap must be satisfied. The raw local program error stays inspectable.” |
| 0:45–0:57 | Select `Shipped / claimable`; select **SHIP**. | “After the configured return gate, the same wallet must complete the project it committed in Module. CohortBuild produces Completion and invokes BuilderLoop through the configured native CPI boundary. This screen is a prepared fixture, not a submitted transaction.” |
| 0:57–1:09 | Go to `/reward/`; point to fixed amount and use **PLAY FIXTURE CLAIM**. | “The reward amount is fixed by the Reward account. The claimant cannot choose it, and the recipient account must belong to the signer and use the reward mint. PLAY FIXTURE CLAIM is playback only: it does not sign or transfer.” |
| 1:09–1:19 | Show `Reward claimed` / duplicate state. | “A Claim PDA permits one claim per reward and wallet. The duplicate result is an explicit rejection, not a UI estimate.” |
| 1:19–1:30 | Open `/evidence/`. | “The repository, program IDs, tests, architecture, and trust boundaries are here. Evidence is localnet only today: Devnet deployment and transaction links have not been produced.” |

## Operator cues

- Use one selected Return Rail stage at a time so its proof drawer is readable.
- Do not connect a wallet in the 90-second recording unless a verified local-validator path is intentionally being shown and verbally labeled **LIVE LOCAL VALIDATOR**.
- Do not say “on Devnet,” “live claim,” “transaction confirmed,” “sponsor,” or “retention” while showing a fixture.
- If a control, route, or label differs from this script in the final build, stop and revise the script before recording.
