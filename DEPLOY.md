# Deployment

Devnet deployment is blocked in the current environment because `solana` and `anchor` are not installed in PATH.

Expected future path:

```bash
solana --version
anchor --version
anchor build
anchor test
solana config set --url devnet
anchor deploy
```

Do not record Devnet addresses or transaction links until those commands have run successfully with a safe Devnet keypair and funded test wallet.
