#!/usr/bin/env bash
set -euo pipefail
wallet=/tmp/builderloop-local-authority.json
if [[ ! -f "$wallet" ]]; then
  solana-keygen new --no-bip39-passphrase --silent --outfile "$wallet"
fi
if [[ -f /tmp/builderloop-program.json ]]; then
  cp /tmp/builderloop-program.json target/deploy/builderloop-keypair.json
fi
if [[ -f /tmp/cohort-build-program.json ]]; then
  cp /tmp/cohort-build-program.json target/deploy/cohort_build-keypair.json
fi
solana-keygen pubkey "$wallet"
