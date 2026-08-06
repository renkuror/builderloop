# Test Summary

`anchor build` and `anchor test --skip-build` pass for both real programs and their local-validator CPI/SPL flow. `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, and `pnpm run ci` pass. Evidence is local/test-only; Devnet is excluded.
