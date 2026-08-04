# BuilderLoop Architecture

This repository currently contains a dependency-free local protocol model for the BuilderLoop MVP. It encodes the campaign, Module, native Ship, and reward lifecycle rules as deterministic JavaScript state transitions.

The on-chain Anchor implementation is pending because Solana CLI and Anchor CLI are not installed in the current environment. The local model preserves the security invariants and test matrix semantics so the future Anchor programs can reuse the vectors and negative cases.
