# Heartbeat Loyalty Release Report

## Status

Verified locally and on Solana Devnet. Production Vercel promotion is pending merge/deployment of this branch.

## Devnet evidence

- BuilderLoop: `3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2`
- CohortBuild: `BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF`
- Heartbeat campaign: `4RUY9TDYkW25yLDsQe6X4JDJiWc51jDiAwGAKYTR9WLT`
- LoyaltyConfig: `7Szb6pAR42dq3yuwuhiEQoKLPWbTDhW2uLkq6mVccGkE`
- LoyaltyState: `FsPtJM452w4FTxdvCUiGf5xfwG3JfFeAhcH2Lcb9WhgN`
- LoyaltyRewardGate: `7seDDL9FaTkpM1gYRGtVYvqoChqFQQzfGYWQy6XuCydw`
- Reward: `8DRLdGdCbVSpbpi8FTTHbWJuhCiaTpA6DA2H7HPgfwDD`

The successful transaction links are the policy creation, first activity, second valid return, and loyalty-gated fixed SPL claim listed in the README. The verification script confirmed the two-return stored state (750 score, streak 2), the recorded lazy-decay observation (550 after one missed period), replay/anti-burst/claim rejections, PDA graph, policy hash, token bindings, and current Clock-derived score.

## Checks run

- `pnpm run ci` — PASS
- `cargo fmt --all -- --check` — PASS
- `cargo clippy --workspace --all-targets -- -D warnings` — PASS.
- `cargo test --workspace` — PASS
- `anchor build` — PASS
- local legacy Anchor integration — PASS
- local Heartbeat Anchor integration — PASS
- `pnpm secrets` — PASS
- `pnpm links` — PASS
- `pnpm heartbeat:verify` — PASS
- `pnpm devnet:verify` — PASS

## Limitations

- The public Vercel URL remains the pre-merge deployment until the repository owner promotes this branch.
- The shortened Devnet heartbeat naturally decays after the evidence session; the frontend derives that current state truthfully and also links the stored-state transactions.
- Browser automation was not rerun during the final Devnet release window.
