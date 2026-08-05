# Local Demo

```sh
scripts/prepare-localnet.sh
anchor build
anchor test --skip-build
pnpm frontend:build
python3 -m http.server 4173 --directory dist/web
```

The Anchor test starts an ephemeral validator, creates real campaign/user/module/source/reward accounts, submits an Ed25519 precompile plus Module instruction, waits for real local Clock gates, executes CohortBuild's signed CPI, transfers a fixed local SPL payout, rejects adversarial variants, withdraws expired inventory, and closes a second reward/vault.

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
