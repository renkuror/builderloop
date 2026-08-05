# Final Completion Checklist

## Code
- [x] BuilderLoop and CohortBuild build.
- [x] Campaign config freezes and hashes deterministically.
- [x] UserProgress enforces ordered stages.
- [x] Pending/cancel/finalize Module works.
- [x] Verifier deactivation/epoch works.
- [x] Artifact Lineage works.
- [x] Native Completion is wallet-bound.
- [x] Clock time/period gates work.
- [x] Reward full lifecycle works.
- [x] Claim amount fixed and duplicate blocked.

## Product
- [x] Campaign screen.
- [x] Progress screen.
- [x] Reward screen.
- [x] Wallet connection.
- [x] Exact lock reasons.
- [x] Honest authority labels.
- [x] Privacy disclosure.
- [x] Issuer/reward CLI.

## Verification
- [x] Every locally available P0 test passes.
- [x] Full available suite passes.
- [x] Format/lint/typecheck/build pass.
- [x] No secrets tracked.
- [x] Worktree clean or documented.
- [x] Completed packages committed.

## Documentation
- [x] README.md
- [x] docs/ARCHITECTURE.md
- [x] docs/THREAT_MODEL.md
- [x] docs/TRUST_MODEL.md
- [x] docs/DEMO.md
- [x] DEPLOY.md
- [x] evidence artifacts/templates
- [x] .codex state files
- [x] FINAL_REPORT.md

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
