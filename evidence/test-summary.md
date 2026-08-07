# Test Summary

`anchor build` and `anchor test --skip-build` cover both real programs and their local-validator CPI/SPL flow. `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, and `pnpm run ci` cover the deterministic and frontend suites. Devnet evidence is maintained separately in `deployments/devnet.json` and the public evidence JSON files.
