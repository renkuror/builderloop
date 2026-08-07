# BuilderLoop Frontend Demo Shotlist

> Historical local-fixture shotlist captured before Devnet deployment. Current public Devnet proof is in [DEVNET_RELEASE_REPORT.md](../DEVNET_RELEASE_REPORT.md); these frames must not be relabeled as Devnet evidence.

## Capture status

The first eleven rows below are actual local-build screenshots captured on 2026-08-06. They are fixture views, not live transactions or Devnet evidence. No demo video has been recorded. The optional local-validator row remains deliberately uncaptured because no wallet or local account values were fabricated.

All fixture frames visibly show **DEMO FIXTURE — NOT LIVE**. Any optional connected frame must visibly show **LIVE LOCAL VALIDATOR**. These historical frames are localnet-only and must not be relabeled as current Devnet evidence.

| # | Actual filename | Route / prepared state | Required visual proof | Capture status |
| ---: | --- | --- | --- | --- |
| 01 | `desktop-hero-fixture.png` | `/` at 1440×900 | Headline, original keyboard art, **OPEN JUDGE DEMO**, **VIEW EVIDENCE**, fixture label. | CAPTURED — fixture |
| 02 | `mobile-hero-fixture.png` | `/` at 390×844 | Single-column layout, controlled art crop, visible CTAs, no horizontal overflow. | CAPTURED — fixture |
| 03 | `keycap-focus-fixture.png` | `/` at 1280×760 | **OPEN JUDGE DEMO** receives genuine keyboard focus. | CAPTURED — fixture |
| 04 | `return-rail-fixture.png` | `/demo/?scenario=shipped` | Clickable rail: **MODULE**, **RETURN GATE**, **SHIP**, **REWARD**, plus proof drawer. | CAPTURED — fixture |
| 05 | `pending-module-fixture.png` | `/demo/?scenario=pending-module` | Pending Module, locked downstream stages, exact prepared-state label. | CAPTURED — fixture |
| 06 | `early-ship-rejection-fixture.png` | `/demo/?scenario=early-ship` | `LOCKED` Return Gate, rejected Ship, readable time/period rejection reason. | CAPTURED — fixture |
| 07 | `shipped-fixture.png` | `/demo/?scenario=shipped` | Shipped and claimable prepared state; no signature/Explorer implication. | CAPTURED — fixture |
| 08 | `reward-claimable-fixture.png` | `/reward/?scenario=shipped` | Fixed amount, claimable fixture status, and explicitly non-live playback control. | CAPTURED — fixture |
| 09 | `reward-claimed-fixture.png` | `/reward/?scenario=claimed` | Claimed fixture and exact **SHOW DUPLICATE REJECTION** control. | CAPTURED — fixture |
| 10 | `architecture-fixture.png` | `/architecture/` | Static technical panels for accounts, CohortBuild → BuilderLoop native CPI, SPL Token vault. | CAPTURED — fixture |
| 11 | `evidence-fixture.png` | `/evidence/` | Public GitHub, program IDs, documents, and unambiguous localnet-only/Devnet-not-produced disclosure. | CAPTURED — fixture |
| 12 | — | `/progress/` or `/reward/` | Optional **LIVE LOCAL VALIDATOR** panel with **CONNECT LOCAL WALLET**; no claim this is Devnet. | NOT CAPTURED — requires real local wallet/accounts |

## Capture rules

- Capture the browser chrome only if it helps confirm the local URL; otherwise keep the product viewport clean.
- Do not blur, crop, retouch, or compose a screenshot to conceal a failure or create an impression of a successful transaction.
- Do not add fake transaction links, signatures, wallet balances, sponsor marks, or status badges in post-production.
- Preserve the exact UI labels from the build. In particular, do not shorten **DEMO FIXTURE — NOT LIVE** to “demo” or “live preview.”
- If a required state cannot be reached in the actual build, mark it as not captured; do not use a design mockup instead.

## File handoff

Captured files are under `docs/assets/frontend/`; they are not retouched and every captured state is labeled as a fixture. A local screenshot does not close the Devnet deployment/transaction-link requirement.
