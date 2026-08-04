# Final Completion Checklist

## Code
- [ ] BuilderLoop and CohortBuild build.
- [ ] Campaign config freezes and hashes deterministically.
- [ ] UserProgress enforces ordered stages.
- [ ] Pending/cancel/finalize Module works.
- [ ] Verifier deactivation/epoch works.
- [ ] Artifact Lineage works.
- [ ] Native Completion is wallet-bound.
- [ ] Clock time/period gates work.
- [ ] Reward full lifecycle works.
- [ ] Claim amount fixed and duplicate blocked.

## Product
- [ ] Campaign screen.
- [ ] Progress screen.
- [ ] Reward screen.
- [ ] Wallet connection.
- [ ] Exact lock reasons.
- [ ] Honest authority labels.
- [ ] Privacy disclosure.
- [ ] Issuer/reward CLI.

## Verification
- [ ] Every P0 test passes.
- [ ] Full available suite passes.
- [ ] Format/lint/typecheck/build pass.
- [ ] No secrets tracked.
- [ ] Worktree clean or documented.
- [ ] Completed packages committed.

## Documentation
- [ ] README.md
- [ ] docs/ARCHITECTURE.md
- [ ] docs/THREAT_MODEL.md
- [ ] docs/TRUST_MODEL.md
- [ ] docs/DEMO.md
- [ ] DEPLOY.md
- [ ] evidence artifacts/templates
- [ ] .codex state files
- [ ] FINAL_REPORT.md

## Truth rules

README must say:
- no unique-human proof;
- no Sybil resistance;
- Module is verifier-attested;
- reference source may be team-controlled;
- sponsor independence only with evidence;
- local tests do not prove organic retention;
- test payout is not an off-chain service.

README must not say:
- time cannot be farmed;
- prevents farming;
- proves loyal humans;
- trustless GitHub verification;
- independent sponsor without proof;
- external integration without proof.

## FINAL_REPORT.md format

```markdown
# BuilderLoop Final Report

## Status
COMPLETE | PARTIAL | BLOCKED

## Completed work packages
- WP...

## Repository architecture
- concise paths

## Security invariants implemented
- concise list

## Tests
| Command | Result | Notes |
|---|---|---|

## Commits
- hash — message

## Local demo
1. exact commands
2. expected transitions

## Devnet evidence
- real links only, or `Not produced`
- exact blocker

## External blockers
- network / keypair / Devnet SOL / real-time gap / sponsor / eligibility

## Known limitations
- implementation-specific

## Exact next commands
```sh
...
```

## Manual review hotspots
- signers/owners/PDAs
- config serialization/hash
- Ed25519 inspection
- CPI source binding
- vault/close destinations
```

Final chat response must be short: status, packages, tests, commits, blockers, report path, exact next command. Do not paste the full report.
