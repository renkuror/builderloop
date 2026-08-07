# Localnet and Devnet Deployment

Mainnet is absolutely forbidden. Localnet regression remains available below; the public Devnet flow is documented in `docs/DEVNET_RUNBOOK.md`.

```sh
solana --version
solana-test-validator --version
anchor --version
scripts/prepare-localnet.sh
anchor build
anchor test --skip-build
```

The suite manages an ephemeral validator and ephemeral `/tmp/builderloop-local-authority.json`. `Anchor.toml` loads the built `.so` files at their fixed IDs through local validator genesis, so the reproducible test command needs no program deployment keypairs. Wallet and program secret keys are never tracked.

For a persistent local demo, start `solana-test-validator --reset`, set `ANCHOR_PROVIDER_URL=http://127.0.0.1:8899` and `ANCHOR_WALLET=/tmp/builderloop-local-authority.json`, deploy with `anchor deploy`, then use the issuer CLI to create/freeze/start the campaign. All resulting addresses and transaction signatures are local-only and must be labeled as such.
