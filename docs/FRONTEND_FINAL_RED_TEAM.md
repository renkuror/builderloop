# BuilderLoop Frontend Final Red Team

> Historical localnet/fixture review. The current public Devnet release supersedes its deployment-status statements; see [DEVNET_RELEASE_REPORT.md](../DEVNET_RELEASE_REPORT.md).

## Purpose and current constraint

This review covers the final local build, actual fixture screenshots captured on 2026-08-06, unit checks, and browser E2E checks. **Current review status: frontend checks passed; demo recording and Devnet evidence remain pending.** This document does not certify a Devnet submission.

The central evidence constraint is already known: the repository has localnet-only evidence. **Devnet deployment, Devnet program addresses, and Devnet transaction links have not been produced.** For the stated Superteam Poland challenge, that is a material submission gap, not a cosmetic documentation issue.

## Bounty judge review

| Question | Pass condition | Status |
| --- | --- | --- |
| Is the product understandable in 15 seconds? | The root route clearly communicates ordered return rewards, not generic points. | PASS — root screenshot + E2E |
| Is the novel mechanism visible? | The Return Rail shows **MODULE → RETURN GATE → SHIP → REWARD** and explains why time/period gating matters. | PASS — rail screenshots + E2E |
| Is Solana relevance concrete? | Native CPI, program-owned validation, same-wallet progression, and fixed SPL settlement are visible without jargon-only claims. | PASS — architecture/reward screenshots |
| Are scoring-relevant artifacts discoverable? | GitHub, IDs, architecture, threat/trust materials, tests, and client paths are linked or described accurately. | PASS — evidence screenshot |
| Is Devnet evidence represented truthfully? | Localnet-only status is explicit; no Devnet link, address, or signature is invented. | PASS (disclosure) — known evidence gap |
| Is the client publicly understandable without wallet friction? | `/demo/` works as a read-only path and says **DEMO FIXTURE — NOT LIVE**. | PASS — E2E |

## Skeptical Solana engineer review

| Question | Pass condition | Status |
| --- | --- | --- |
| Are enforced vs disclosed boundaries separated? | Frozen configuration, same-wallet/project checks, source validation, time/period gates, and reward rules are not conflated with verifier/sponsor trust. | PASS — copy review |
| Does a pending Module unlock Ship? | No. Pending states lock Return Gate, Ship, and Reward in the UI and explanation. | PASS — pending screenshot |
| Is early Ship failure precise? | The UI exposes `LOCKED`, the elapsed-time/period-gap reason, and raw detail. | PASS — rejection screenshot + E2E |
| Is Ship described accurately? | It is tied to validated Completion and CohortBuild → BuilderLoop native CPI; fixture media does not pose as a transaction. | PASS — shipped screenshot |
| Is fixed settlement described accurately? | Claim amount comes from Reward, recipient must be signer-owned/same mint, and duplicate protection is one Claim PDA per reward/wallet. | PASS — reward screenshots |
| Does live success wait for verified account state? | The documented state sequence includes signature through refetch/account-state verification. | PASS — unit coverage; no live claim fabricated |
| Are local signatures treated correctly? | They are called ephemeral local-validator artifacts, never durable public Explorer proof. | PASS — copy review |

## First-time user review

| Question | Pass condition | Status |
| --- | --- | --- |
| Can a visitor find the demo? | **OPEN JUDGE DEMO** is prominent and keyboard-accessible. | PASS — focus screenshot + E2E |
| Can a visitor understand the status? | Proof drawer pairs each rail stage with a clear explanation and status. | PASS — rail screenshots |
| Can a visitor tell fixture from live? | **DEMO FIXTURE — NOT LIVE** is present; local wallet panel reads **LIVE LOCAL VALIDATOR**. | PASS — fixture screenshots; live panel not activated |
| Are controls honest? | Every mechanical keycap works; panels and architecture nodes do not look clickable. | PASS — browser smoke |
| Can it be used on mobile? | 390×844 test shows no page overflow and keeps rail/proof information usable. | PASS — mobile screenshot + E2E |
| Can it be recorded cleanly? | The 90-second path has no wallet requirement and no dead controls. | PASS (playback); video remains unrecorded |

## Red flags that block sign-off

- A fixture is called live, Devnet, submitted, confirmed, or paid.
- A transaction link/signature, wallet balance, sponsor statement, user metric, retention result, or Devnet deployment is fabricated.
- The label **DEMO FIXTURE — NOT LIVE** is missing from fixture capture.
- The label **LIVE LOCAL VALIDATOR** is missing from the optional connected path or is portrayed as Devnet.
- A raised keycap does not act; a static panel implies an action; or the Return Rail does not open its proof.
- Early Ship does not expose a specific lock reason.
- A claim outcome is shown before confirmed/refetched/verified state in the genuine local flow.
- Mobile view overflows or blocks keyboard/screen-reader use.
- Screenshot/video plans are described as completed when capture is still pending.
- The final submission claims to meet Devnet deployment/link requirements while that evidence remains absent.

## Sign-off decision

| Decision | Condition |
| --- | --- |
| `READY FOR LOCALNET DEMO` | Final build passes manual QA and red-team checks; actual media is captured and accurately labeled as fixture/local validator. |
| `NOT READY FOR BOUNTY EVIDENCE` | Any blocking red flag exists, including absent Devnet deployment or transaction links where the challenge requires them. |
| `READY FOR DEVNET-CLAIMED SUBMISSION` | Only after real Devnet deployment, real public program addresses, real transaction links, and a re-recorded/re-reviewed client evidence path exist. |

The appropriate frontend decision is **READY FOR LOCALNET DEMO**. The appropriate evidence decision remains **NOT READY FOR BOUNTY EVIDENCE** because Devnet proof has not been produced. This is not a statement about code quality or localnet behavior; it is a truthful boundary on what the available evidence supports.
