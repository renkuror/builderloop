# Local Demo

> The primary local proof is now Heartbeat Loyalty. Run `NO_DNA=1 anchor test --skip-build` to exercise verifier-signed recurring activity, anti-burst rejection, lazy Clock decay, tiers, and the loyalty-gated SPL consumer. The Module → Return → Ship material below remains the CohortBuild reference-adapter proof.

```sh
scripts/prepare-localnet.sh
anchor build
anchor test --skip-build
pnpm frontend:build
python3 -m http.server 4173 --directory dist/web
```

The Anchor suite starts an ephemeral validator. It creates real heartbeat policy/state/activity/reward-gate accounts, submits verifier Ed25519 activity proofs, rejects replay and burst variants, waits for local Clock windows, derives lazy decay, and transfers a fixed local SPL payout only after the loyalty threshold. It also preserves and exercises the original Module instruction, Clock gates, CohortBuild signed CPI, and legacy Reward/Claim lifecycle.

For the browser demo, keep a local validator and deployed fixture running, open `http://127.0.0.1:4173`, connect a local wallet, and enter the emitted Campaign and Reward PDAs. The screens fetch program-owned accounts; no progression database is used.

CLI examples:

```sh
node cli/builderloop.js campaign-hash evidence/campaign-config.json
node cli/builderloop.js issue-module input/module.json /tmp/verifier.json
node cli/builderloop.js inspect-module evidence/module-attestation.json
node cli/builderloop.js campaign-freeze <CAMPAIGN_PDA>
node cli/builderloop.js reward-activate reward-accounts.json
node cli/builderloop.js export-evidence
```
