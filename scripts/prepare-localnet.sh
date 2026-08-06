#!/usr/bin/env bash
set -euo pipefail
wallet=/tmp/builderloop-local-authority.json
if [[ ! -f "$wallet" ]]; then
  solana-keygen new --no-bip39-passphrase --silent --outfile "$wallet"
fi
solana-keygen pubkey "$wallet"
