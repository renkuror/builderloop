# BuilderLoop Frontend Manual QA

## Scope and evidence status

Run this against the final built client, not a design file. Record actual `PASS`, `FAIL`, or `NOT RUN` next to each item. This checklist does not certify Devnet readiness: the current repository has localnet-only evidence and Devnet deployment/transaction links are not produced.

| Area | Manual check | Expected result | Result |
| --- | --- | --- | --- |
| Routes | Open `/`. | Headline, original line art, **OPEN JUDGE DEMO**, **VIEW EVIDENCE**, and provenance label render. |  |
| Routes | Open `/demo/`. | Prepared no-wallet path renders; **DEMO FIXTURE — NOT LIVE** is visible. |  |
| Routes | Open `/campaign/`, `/progress/`, `/reward/`, `/architecture/`, `/evidence/`. | Each route renders its intended content without a blank screen or console error. |  |
| Navigation | Use header navigation and browser Back/Forward. | Correct route is selected and content changes consistently. |  |
| Primary CTA | Activate **OPEN JUDGE DEMO** with pointer and keyboard. | Opens `/demo/`; no wallet is required. |  |
| Evidence CTA | Activate **VIEW EVIDENCE** with pointer and keyboard. | Opens `/evidence/`; localnet-only disclosure remains visible. |  |
| Return Rail | Select **MODULE**, **RETURN GATE**, **SHIP**, and **REWARD**. | Each is a real control; the selected proof drawer updates/focuses and status is readable. |  |
| Pending state | Select `Pending Module`. | Downstream stages remain locked; pending Module is not presented as Ship-ready. |  |
| Early Ship | Select `Early Ship rejection`; inspect details. | `LOCKED` and the elapsed-time/period-gap explanation are visible; raw detail is available. |  |
| Shipped state | Select `Shipped / claimable`. | The UI depicts the ordered fixture state without claiming it has a public signature. |  |
| Claim fixture | On `/reward/`, use **PLAY FIXTURE CLAIM**. | Fixture feedback is clear and never claims a signature or token transfer. |  |
| Duplicate claim | Select `Reward claimed` and use the duplicate/rejection control. | One-claim-per-reward-and-wallet rule is legible; rejection is not silently ignored. |  |
| Campaign | Inspect frozen config details and copy hash control. | Static information is a technical panel; only copy is a keycap; config/trust text is readable. |  |
| Progress | Inspect project commitment, Completion description, artifact hash, earliest Ship time. | Exact blockers and source validation intent are understandable; no fictitious Explorer link appears. |  |
| Reward | Inspect amount, mint, recipient rule, claim window, duplicate protection, withdrawal rule. | Amount is fixed, recipient constraint is clear, and no valuation is implied. |  |
| Architecture | Inspect all account nodes and CPI lane. | Nodes are static panels, not fake buttons; CohortBuild → BuilderLoop → SPL vault relationship is understandable. |  |
| Evidence | Inspect GitHub, IDs, docs, screenshot/video statements. | Evidence correctly says localnet only and Devnet address/transaction links are not produced. Screenshot/video copy must match actual capture status: until files exist, it must say pending/not captured. If the UI says captures exist, `docs/assets/frontend/` must exist and contain the named actual captures; otherwise this check is `FAIL`. |  |
| Optional local path | Open **LIVE LOCAL VALIDATOR** only with a running local validator. | **CONNECT LOCAL WALLET** and genuine local input fields work or fail plainly; no Devnet implication. |  |
| Transaction state | If a genuine local action is exercised. | UI reports success only after signature, submit, confirmation, finalization, refetch, and verified account state. |  |
| Keyboard | Tab through links/buttons; use Enter/Space. | Visible focus, logical order, and no keyboard trap. |  |
| Sound | Toggle sound, reload, activate a control. | No autoplay, mute choice persists, and a single activation does not double-play. |  |
| Responsive | Test 1440×900, 1280×720, and 390×844. | Legible layout; mobile has no page-level horizontal overflow; rail/proof drawer remains usable. |  |
| Reduced motion | Enable OS/browser reduced motion. | Essential state remains clear without dependent animation. |  |
| Accessibility | Inspect semantics and contrast with browser tooling. | Controls have names, decorative art is hidden where appropriate, and contrast/focus are sufficient. |  |
| Truthfulness | Search visually for live/proven claims. | Fixture/local labels are exact; no false Devnet, sponsor, Sybil-resistance, retention, transaction, or metric claim appears. |  |

## Failure reporting

For each failure, save the route, viewport, prepared scenario, exact action, observed result, expected result, console output, and a non-retouched screenshot/video. Do not change the test scenario or omit the failing state to make a demo appear successful.

## QA completion note

Manual QA is complete only when all applicable entries have results and blocking failures are resolved or explicitly recorded. Passing this checklist does not replace the challenge's still-unmet Devnet deployment and transaction-link evidence.
