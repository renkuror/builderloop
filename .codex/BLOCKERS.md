# BuilderLoop Blockers

## Current

- No blocker remains for localnet scope.
- Devnet/mainnet deployment and external sponsor/retention evidence are explicitly excluded, not environment blockers.

## Historical resolution

- The former Windows toolchain blocker was resolved in Ubuntu/WSL2. Solana/validator 4.1.1 and Anchor 0.32.1 now build and execute the local integration suite.
- AVM 1.1.2 is not used to select Anchor; the pinned user-local Cargo-installed `anchor` binary is verified directly.
