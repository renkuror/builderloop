# BuilderLoop Frontend Bounty Brief

## Submission context

BuilderLoop is being prepared for the official Superteam Poland **On-Chain Loyalty Rewards System Challenge**. The public listing names a deadline of **2026-08-07T21:59:59Z**. This brief records the facts that govern the frontend and its evidence; it is not a claim that a submission has been completed.

Official references:

- [Challenge listing](https://superteam.fun/earn/listing/on-chain-loyalty-rewards-system-challenge)
- [Public GitHub repository](https://github.com/renkuror/builderloop)

## What the challenge requires

The supplied challenge brief calls for a Solana loyalty/rewards system implemented in Rust with Anchor or the native SDK, a Devnet program deployment and transaction links, a public GitHub repository, and a publicly testable client (frontend or CLI). The README must explain the novel loyalty mechanism, why Solana infrastructure is used, and relevant tradeoffs.

BuilderLoop's mechanism is deliberately narrower than a generic points system:

```text
verified Module → configured return gate → same-wallet, same-project Ship → fixed SPL reward
```

The product claim should remain equally narrow: the program can enforce ordered, wallet-bound progression under a frozen campaign configuration. It does not prove unique humans, Sybil resistance, sponsor independence, organic retention, or trustless off-chain verification.

## Judging map

| Criterion | Weight | What the frontend should make inspectable |
| --- | ---: | --- |
| Innovation and originality | 35% | Why a return gate and ordered progression are different from merely awarding points. |
| Architecture and advanced Solana features | 25% | Frozen campaign configuration, source-account validation, native CohortBuild → BuilderLoop CPI, and SPL reward settlement. |
| Code quality and Rust patterns | 15% | Public repository, program IDs, architecture/threat-model links, and reproducible local checks. |
| Composability and ecosystem fit | 15% | The reference CohortBuild program, native CPI boundary, and explicit source authority. |
| UX / client usability | 10% | A no-wallet judge route, readable lock reasons, proof drawers, responsive layouts, and an optional local-wallet path. |

## Frontend contract

The judge-facing client has these static routes:

| Route | Reviewer job |
| --- | --- |
| `/` | Understand the product in roughly 10–15 seconds and open the judge path. |
| `/demo/` | Inspect a read-only prepared scenario without connecting a wallet. |
| `/campaign/` | Inspect the frozen eligibility configuration and trust boundary. |
| `/progress/` | Inspect wallet-bound progression and the reason a Ship is locked or allowed. |
| `/reward/` | Inspect fixed settlement, recipient binding, and duplicate protection. |
| `/architecture/` | Inspect the source program, native CPI, accounts, and SPL vault relationship. |
| `/evidence/` | Inspect repository and local-test evidence without invented Explorer links. |

The primary entry actions are **OPEN JUDGE DEMO** and **VIEW EVIDENCE**. The signature interaction is the Return Rail:

```text
01 MODULE → 02 RETURN GATE → 03 SHIP → 04 REWARD
```

Its stages are proof controls, not decoration: selecting one must show the relevant proof drawer. The fixture path must visibly carry the exact label **DEMO FIXTURE — NOT LIVE**. The optional wallet panel must be labeled **LIVE LOCAL VALIDATOR** and use **CONNECT LOCAL WALLET**; it is not a Devnet wallet path.

## Evidence posture and current gap

**Current repository evidence is localnet only. Devnet deployment, Devnet program addresses, and Devnet transaction links have not been produced.** Local validator signatures are ephemeral and must not be presented as durable Explorer evidence.

That gap is material for a challenge requiring Devnet deployment and transaction links. Until it is closed with real deployment output, the frontend and any recording must:

- label prepared states **DEMO FIXTURE — NOT LIVE**;
- label the optional connected path **LIVE LOCAL VALIDATOR**;
- avoid a `LIVE DEVNET` label, Devnet address, Devnet signature, Explorer URL, sponsor claim, or live-user metric;
- describe screenshots and video as pending unless they were actually captured from the final build or during the final recording; and
- present localnet tests as local evidence, not as a substitute for Devnet submission evidence.

## Demo priorities

Use the demo to make enforcement observable, not to simulate a live network:

1. Show the frozen return rule and finalized-Module prerequisite.
2. Show a pending Module and an early Ship rejection with its human-readable error and raw detail.
3. Show the post-CPI Shipped state and the fixed-reward rule as prepared fixture states.
4. Show duplicate-claim rejection as a fixture outcome.
5. End at `/evidence/` with the public repository, localnet-only disclosure, and no fabricated transaction links.

Any future Devnet recording must be regenerated from real Devnet accounts and links, then relabeled and re-reviewed. Do not recycle fixture media as Devnet evidence.
