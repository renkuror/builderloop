# Threat Model

BuilderLoop defends campaign ordering, frozen eligibility, exact Module event replay, same-wallet same-project native completion, and fixed recipient-bound SPL settlement.

The adversary may control transaction account ordering, instruction data, wallets other than the eligible signer, arbitrary accounts/programs, stale vouchers, malformed Ed25519 offsets, substituted messages, incorrect Completion accounts, and incorrect token accounts. Signer constraints, PDA seeds, owners, discriminators, exact layouts, frozen identities, Clock values, checked arithmetic, CPI signer derivation, token constraints, and one-use PDAs reject these substitutions.

Trusted roles remain: campaign authority before freeze, the fixed Module verifier while active, reward authority for funding/lifecycle, and the configured source program's completion semantics. The reference source may be team-controlled. Compromised trusted roles can attest or complete actions within their defined role, but cannot bypass wallet signatures, frozen identities, the time/period gates, or the fixed claim amount.

Out of scope: unique-human proof, Sybil resistance, farming prevention, organic-retention proof, trustless off-chain verification, sponsor independence without external evidence, and mainnet operational security.
