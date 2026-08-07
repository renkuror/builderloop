# BuilderLoop Decisions

## 2026-08-08: Public production URL and audit boundary

- Use the GitHub/Vercel-verified canonical alias `https://builderloop-tan.vercel.app` as the public Demo URL; retain the immutable deployment URL only as audit metadata. No Vercel URL is inferred from a placeholder.
- Add `pnpm public:verify` as a read-only release check for direct routes, public bundle environment/security markers, and checked-in Devnet Explorer links. It does not submit transactions or require a wallet.
- Report the public HTTP/Devnet release as verified while keeping browser visual/console/wallet automation explicitly limited by the unavailable Chromium executable and local bind permission.

## 2026-08-05: Initial Repository Baseline

- Use `main` as the default branch.
- Use `codex/night-build` for all implementation after the initial specification commit.
- Use `pnpm` as the Node package manager because it is installed and avoids the local PowerShell `npm.ps1` execution-policy block.
- Do not fabricate Devnet addresses, transaction links, sponsors, funding, or live evidence.

## 2026-08-05: Frozen deterministic wire layouts

- `CampaignConfig` hash input is binary, not JSON: `BUILDERLOOP_CONFIG_V1` followed by the exact field order in `crates/protocol-core/src/lib.rs::config_bytes`; integers are little-endian and booleans are one byte.
- `project_id` is SHA-256 over `BUILDERLOOP_PROJECT_V1 || program_id || campaign || user || project_seed_hash`.
- Module vouchers use the fixed-width `BUILDERLOOP_MODULE_V1` layout in `attestation_bytes`; no user-selected namespace/canonicalizer value is serialized into a voucher.
- The Rust core is dependency-free so byte vectors and overflow rules remain executable before Anchor/Solana installation. It is not evidence that an on-chain program has been deployed or exercised.

## 2026-08-05: WSL on-chain stack

- Pin Anchor crates and CLI to 0.32.1. Use the installed Agave 4.1.1 CLI/validator after proving both SBF build and local-validator execution work; do not downgrade a green validator stack merely to match Anchor's internal Solana 2.3 crates.
- Restrict rewards to the classic SPL Token program so transfer-fee extensions cannot reduce the fixed recipient payout.
- The CohortBuild source-authority PDA is `[b"builderloop_authority", builderloop_program_id]`; it is marked signer in BuilderLoop CPI metadata and can only sign through CohortBuild `invoke_signed`.
- Completion is explicitly serialized before CPI because Anchor otherwise writes new account data only at handler exit.

## 2026-08-06: Mechanical Manga frontend evidence

- Keep the public judge path as deterministic, read-only fixtures labeled `DEMO FIXTURE — NOT LIVE`. The wallet path is optional and labeled `LIVE LOCAL VALIDATOR`; no Devnet or public transaction link is synthesized.
- Treat fixture transitions as illustration only. The genuine local Claim path exposes transaction states through finalized account refetch and verification before it reports success.
- Use the repository-local `.pnpm-store` so the workspace retains one reproducible pnpm link target. Exclude that generated dependency cache from the secret scanner just as `node_modules` is excluded; source and documentation remain scanned.
- Playwright uses its normal managed browser when installed. The config can use an already-present local Chromium cache only as a development fallback after an interrupted headless-shell download; it does not change the test behavior or claim production browser evidence.

## 2026-08-07: Devnet release identities and evidence

- Reuse the audited BuilderLoop and CohortBuild program IDs on Devnet. The source `declare_id!`, `anchor keys list`, generated keypair public keys, IDLs, and CohortBuild CPI target all agree; regenerating IDs would change the voucher domain and is unnecessary.
- Keep `Anchor.toml` localnet provider defaults for regression, add explicit `[programs.devnet]` identities, and pass `--provider.cluster devnet` plus the external fee payer on every deployment command.
- `deployments/devnet.json` and evidence files contain only public addresses/signatures. Ephemeral demo role secrets are generated in memory and never written.
- `scripts/export-evidence.js` preserves real Devnet evidence rather than replacing it with localnet placeholders.
