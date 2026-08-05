# BuilderLoop Migration Audit

Audited: 2026-08-05

## Git and GitHub

- Current branch: `codex/night-build` at `9fb9d72`.
- Default branch: `main` at `93b0b98`.
- Local branches: `main`, `codex/night-build`, and safety branch `backup/pre-migration`.
- Remote before migration: `origin -> https://github.com/Skizm-tzz/builderloop.git`.
- Tags: none.
- Worktree: clean; no untracked files.
- Active GitHub CLI session at audit time: invalid `Skizm-tzz` session. Migration later completed under verified `renkuror`; see `MIGRATION_RESULT.md`.
- Destination requested: `renkuror/builderloop` (private unless an existing repository has user-selected visibility).

## Installed tools

| Tool | Status |
|---|---|
| Git | `2.55.0.windows.3` |
| GitHub CLI | `2.95.0` (authentication invalid) |
| Rust / rustup / Cargo | `1.96.0` / `1.29.0` / `1.96.0` |
| rustfmt / clippy | installed |
| Node.js / npm / pnpm | `24.14.1` / `11.18.0` / `11.9.0` |
| Solana CLI | missing |
| Anchor CLI / AVM | missing |
| TypeScript CLI | missing |
| WSL distro | missing; WSL 1 component is unavailable |
| Native C/C++ build tools | not found on PATH |

## Claimed versus verified work packages

| WP | Claimed status | Verified status | Missing implementation | Missing tests | Blocking dependency | Next action |
|---|---|---|---|---|---|---|
| WP0 | complete | partial | version pins and byte-layout ADRs | audit evidence | none | complete audit and lock versions |
| WP1 | complete | incomplete | Anchor workspace, Rust/TS vectors | A01-A09 | Solana/Anchor | install toolchain and scaffold |
| WP2 | complete | incomplete | on-chain accounts/instructions | B01-B10, C01-C06 | Solana/Anchor | implement BuilderLoop program |
| WP3 | complete | incomplete | Ed25519 instruction inspection, receipts, replay PDA | D01-D18 | Solana/Anchor | implement attestation flow |
| WP4 | complete | incomplete | CohortBuild program and CPI | E01-E15 | Solana/Anchor | implement source and CPI |
| WP5 | complete | incomplete | canonical SPL vault, claims, close flow | F01-F21 | Solana/Anchor | implement token lifecycle |
| WP6 | complete | incomplete | wallet/on-chain client and functional screens | G01-G08 | JS dependencies and program IDL | implement client after programs |
| WP7 | complete | incomplete | full adversarial suite and honest README | matrix coverage | programs | harden after core |
| WP8 | complete | incomplete | reproducible actual local release evidence | H01-H08 | programs | document after checks |
| WP9 | pending | correctly pending | Devnet deployment | live evidence | keypair/SOL/network | only attempt after local work |

## Findings

The `src/` JavaScript model is useful as an early behavioral sketch, but it is not production program code. It lacks on-chain account ownership, PDA validation, binary serialization, Ed25519 instruction inspection, canonical SPL token handling, CPI atomicity, and functional wallet-connected frontend state. Existing generated evidence is local-model-only and must not be treated as on-chain proof.
