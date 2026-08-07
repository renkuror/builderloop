# BuilderLoop Frontend Recording Checklist

> Historical recording checklist for the local fixture checkpoint. Current Devnet status and public proof are documented in [DEVNET_RELEASE_REPORT.md](../DEVNET_RELEASE_REPORT.md).

## Status and stop condition

**Screenshot capture is complete; recording is pending.** Do not mark this checklist complete until the actual recording exists. Current evidence is localnet only; Devnet deployment and transaction links are an open, material bounty-evidence gap.

## Before recording

- [ ] Build the exact client to be recorded with `pnpm frontend:build`.
- [ ] Run the repository-supported frontend checks and retain the real output.
- [ ] Open `/`, `/demo/`, `/campaign/`, `/progress/`, `/reward/`, `/architecture/`, and `/evidence/` from the final build.
- [ ] Confirm that **OPEN JUDGE DEMO** opens the prepared no-wallet path.
- [ ] Confirm that **VIEW EVIDENCE** opens the evidence route.
- [ ] Confirm the fixture label is exactly **DEMO FIXTURE — NOT LIVE** wherever fixture state appears.
- [ ] Confirm optional wallet controls are labeled **LIVE LOCAL VALIDATOR** and **CONNECT LOCAL WALLET**.
- [ ] Confirm no `LIVE DEVNET` label appears unless real Devnet deployment and verifiable links are available.
- [ ] Remove private wallet material, seed phrases, tokens, shell history, personal browser tabs, and unrelated notifications from view.
- [ ] Disable any browser extension UI that could obscure the product or expose private data.

## Visual and interaction pass

- [ ] Every raised mechanical keycap is a functioning link or button.
- [ ] Static cards, configuration, metrics, and architecture nodes are flat technical panels rather than fake controls.
- [ ] The Return Rail has exactly **MODULE**, **RETURN GATE**, **SHIP**, and **REWARD**, and each stage opens/focuses relevant proof.
- [ ] The early-Ship fixture shows a human-readable lock reason and raw detail.
- [ ] **PLAY FIXTURE CLAIM** is visually and verbally identified as non-live playback.
- [ ] Focus indicators are visible; Enter/Space activate controls where relevant.
- [ ] Desktop 1440×900 and 1280×720 are readable.
- [ ] Mobile 390×844 is usable with no horizontal page overflow.
- [ ] Decorative artwork is not necessary to understand the interface.

## Recording order

- [ ] Record `/` with the headline and primary action.
- [ ] Record `/demo/?scenario=pending-module`.
- [ ] Record `/demo/?scenario=early-ship` and its raw proof/error detail.
- [ ] Record `/demo/?scenario=shipped` and Return Rail proof.
- [ ] Record `/reward/?scenario=claimed` and duplicate-claim rule.
- [ ] Record `/campaign/` frozen configuration/trust disclosure.
- [ ] Record `/architecture/` static CPI blueprint.
- [ ] Record `/evidence/` localnet-only/Devnet-not-produced disclosure.
- [ ] Record an optional **LIVE LOCAL VALIDATOR** segment only if genuine local accounts and the compatible wallet are available.

## Evidence hygiene

- [ ] No fabricated signature, Explorer URL, Devnet address, wallet balance, sponsor statement, user metric, or token valuation is visible.
- [ ] No fixture media is labeled or narrated as `LIVE DEVNET`.
- [ ] No screenshot has been retouched to hide a failure or imply an action occurred.
- [x] Actual fixture captures are placed in `docs/assets/frontend/` and labeled as fixtures in `FRONTEND_DEMO_SHOTLIST.md`.
- [ ] No video or optional local-validator frame is represented as captured until it exists and is labeled by source.

## Final sign-off

- [ ] The recording matches `FRONTEND_DEMO_SCRIPT_90S.md` or `FRONTEND_DEMO_SCRIPT_3MIN.md` exactly enough that its claims remain true.
- [ ] `FRONTEND_MANUAL_QA.md` and `FRONTEND_FINAL_RED_TEAM.md` have been completed against the final build.
- [ ] Devnet evidence status is stated plainly in the recording and final submission materials.
- [ ] If Devnet deployment/transaction links are still unavailable, the submission is not represented as satisfying that challenge requirement.
