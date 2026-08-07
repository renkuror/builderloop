# BuilderLoop Frontend Demo Runbook

> Historical local-fixture recording runbook. The current real-transaction Devnet demo is documented in [docs/DEVNET_RUNBOOK.md](DEVNET_RUNBOOK.md) and [DEVNET_RELEASE_REPORT.md](../DEVNET_RELEASE_REPORT.md).

## Recording status

This is a runbook, not recording evidence. **Fixture screenshots were captured from the final local build on 2026-08-06; a demo video remains unrecorded.** The public judge path is a prepared read-only local fixture and must retain the exact label **DEMO FIXTURE — NOT LIVE** throughout recording.

This historical runbook contains local-fixture evidence only. **Do not present it, a fixture, an ephemeral local-validator signature, or a local test as current Devnet deployment or transaction evidence.**

## Objective

In under 90 seconds, a reviewer should see that BuilderLoop makes a fixed campaign enforce an ordered return path:

```text
MODULE → RETURN GATE → SHIP → REWARD
```

The demo should prove interface clarity and disclose boundaries. It must not pretend that the prepared scenarios submit a wallet transaction.

## Preflight

1. Start from a clean browser profile or window with no unrelated wallet/account data visible.
2. Build the client with the repository-supported command:

   ```sh
   pnpm frontend:build
   ```

3. Serve the generated static client using the repository's supported local method, for example:

   ```sh
   python3 -m http.server 4173 --directory dist/web
   ```

4. Open the root route and verify the footer says localnet/reference implementation rather than Devnet.
5. Verify all seven routes resolve in the build used for recording:

   ```text
   /  /demo/  /campaign/  /progress/  /reward/  /architecture/  /evidence/
   ```

6. Confirm the fixture label is visually readable: **DEMO FIXTURE — NOT LIVE**.
7. Confirm no unsupported Explorer link, transaction signature, sponsor claim, TVL, user count, or live-retention claim is visible.

## Read-only judge path

This is the default recording path; no wallet is required.

1. At `/`, use **OPEN JUDGE DEMO**.
2. At `/demo/`, select the prepared scenarios in this order:
   - `Pending Module`
   - `Early Ship rejection`
   - `Shipped / claimable`
   - `Reward claimed`
3. For each scenario, select the Return Rail stage that best exposes the proof drawer. Keep the rail names literal: **MODULE**, **RETURN GATE**, **SHIP**, and **REWARD**.
4. Expand raw evidence/error detail for the early-Ship scenario so its `ElapsedTimeGate / PeriodGate` explanation is inspectable.
5. At `/reward/`, use **PLAY FIXTURE CLAIM** only as a fixture interaction. Narrate that it neither signs a transaction nor transfers a token.
6. End at `/evidence/`, where the localnet-only disclosure and lack of Devnet links are explicit.

## Optional local-validator path

Use this only if a compatible local validator, browser wallet, and genuine local account addresses are already running. It is supplemental, not required to understand the product.

1. Start the repository's documented local test environment:

   ```sh
   scripts/prepare-localnet.sh
   anchor build
   anchor test --skip-build
   ```

2. On `/progress/` or `/reward/`, find the panel titled **LIVE LOCAL VALIDATOR**.
3. Enter real local values only; do not paste fixture IDs into fields represented as live account addresses.
4. Use **CONNECT LOCAL WALLET**. Confirm the wallet is connected to the local RPC.
5. Record any state only after the client reports the required refetch/account verification. If a real local signature is shown, identify it as local and ephemeral; do not frame it as a public Explorer transaction.

If the local path is unavailable, keep the recording on the no-wallet fixture path. Do not substitute a fabricated “live” result.

## Recovery rules

| Situation | Safe response |
| --- | --- |
| A route fails to load | Stop capture, record the failure, rebuild/retest, and recapture only after it is resolved. |
| A control does nothing | Treat it as a blocking UX defect; do not crop it out or call it decorative. |
| Fixture label is absent | Stop: a recording without provenance labeling is unusable. |
| Wallet/network mismatch | Disconnect or correct local settings; do not label it Devnet. |
| A local transaction fails | Show the plain-language and raw error if useful, then return to the read-only path. Never edit visual evidence to imply success. |
| Devnet evidence is requested | State the gap plainly: Devnet deployment and transaction links are not produced. |

## Post-recording handoff

1. Run the verification commands supported by the repository and retain their actual output.
2. Capture only frames actually seen in the final build; `FRONTEND_DEMO_SHOTLIST.md` records the completed screenshot set and the remaining optional local-validator gap.
3. Store real captures under `docs/assets/frontend/` only if they were actually captured; do not imply that the unrecorded video exists.
4. Check every frame for **DEMO FIXTURE — NOT LIVE** or **LIVE LOCAL VALIDATOR**, as appropriate.
5. Re-run the red-team checklist. Devnet remains an open bounty-evidence gap until real deployment and links exist.
