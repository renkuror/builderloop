# BuilderLoop MVP Technical Specification

## 1. Product

BuilderLoop is a campaign-specific retention eligibility program for one Solana builder cohort.

Core flow:

```text
Module attested
-> challenge delay
-> Module finalized with project commitment
-> minimum elapsed time and period gap
-> same user ships the same project through a native source program
-> Shipper unlocked
-> fixed pre-funded SPL payout claimable
```

Hook: `Points cannot substitute for return.`

The contract does not prove unique identity, deep loyalty, organic retention, or Sybil resistance.

## 2. Actors

- Campaign authority: creates and freezes campaign.
- Module verifier: signs one fixed Module attestation domain.
- Reward authority: creates/funds/activates/pauses/withdraws/closes reward.
- User: joins, submits/finalizes Module, completes Ship, claims.
- CohortBuild source program: creates a user-bound Completion and performs CPI.

Use `separate reward authority` by default. Use `independent sponsor` only with external proof.

## 3. Main accounts

### CampaignConfig

Suggested PDA:

```text
[b"campaign", authority, campaign_id_le_bytes]
```

Fields:

```rust
pub struct CampaignConfig {
    pub authority: Pubkey,
    pub campaign_id: u64,
    pub status: CampaignStatus,
    pub verifier: Pubkey,
    pub verifier_epoch: u32,
    pub verifier_active: bool,
    pub reward_authority: Pubkey,
    pub start_ts: i64,
    pub end_ts: i64,
    pub period_seconds: i64,
    pub total_periods: u8,
    pub min_period_gap: u8,
    pub min_elapsed_seconds: i64,
    pub module_challenge_delay: i64,
    pub module_namespace: u16,
    pub canonicalizer_version: u16,
    pub source_program: Pubkey,
    pub source_authority: Pubkey,
    pub challenge_id: u64,
    pub actions_paused: bool,
    pub config_hash: [u8; 32],
    pub bump: u8,
}
```

Statuses: `Draft -> Frozen -> Active -> Finalized`.

Validate positive/bounded timing, checked arithmetic, non-default authorities/programs, and full config hash. No critical mutation after freeze.

### UserProgress

PDA:

```text
[b"user", campaign, wallet]
```

Fields:

```rust
pub struct UserProgress {
    pub campaign: Pubkey,
    pub wallet: Pubkey,
    pub stage: UserStage,
    pub project_id: [u8; 32],
    pub project_seed_hash: [u8; 32],
    pub module_event_hash: [u8; 32],
    pub module_finalized_at: i64,
    pub module_period: u8,
    pub artifact_hash: [u8; 32],
    pub ship_completed_at: i64,
    pub ship_period: u8,
    pub bump: u8,
}
```

Stages: `Initialized -> ModulePending -> ModuleFinalized -> Shipped`.

No points and no admin level override.

### ModuleReceipt

PDA:

```text
[b"module", campaign, event_id_hash]
```

Fields:

```rust
pub struct ModuleReceipt {
    pub campaign: Pubkey,
    pub user: Pubkey,
    pub event_id_hash: [u8; 32],
    pub project_id: [u8; 32],
    pub project_seed_hash: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub verifier_epoch: u32,
    pub status: ReceiptStatus,
    pub submitted_at: i64,
    pub finalize_after: i64,
    pub bump: u8,
}
```

Statuses: `Pending -> Finalized` or `Pending -> Cancelled`.
Pending does not unlock Ship.

### Reward

PDA:

```text
[b"reward", campaign, reward_authority, reward_id_le_bytes]
```

Fields:

```rust
pub struct Reward {
    pub campaign: Pubkey,
    pub reward_authority: Pubkey,
    pub reward_id: u64,
    pub config_hash: [u8; 32],
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub amount_per_claim: u64,
    pub max_claims: u32,
    pub claimed_count: u32,
    pub starts_at: i64,
    pub ends_at: i64,
    pub status: RewardStatus,
    pub bump: u8,
}
```

Implement explicit lifecycle: `Draft -> Funded -> Active -> Paused/Ended -> Closed`.

### Claim

PDA:

```text
[b"claim", reward, user]
```

Fields:

```rust
pub struct Claim {
    pub reward: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub claimed_at: i64,
    pub bump: u8,
}
```

One reward-wallet pair can create at most one Claim.

## 4. Reference CohortBuild program

Accounts:
- Challenge;
- BuildSubmission;
- Completion.

Completion:

```rust
pub struct Completion {
    pub user: Pubkey,
    pub challenge_id: u64,
    pub project_id: [u8; 32],
    pub artifact_hash: [u8; 32],
    pub completed_at: i64,
    pub completed: bool,
    pub bump: u8,
}
```

Suggested PDA:

```text
[b"completion", challenge_id_le_bytes, user]
```

Source authority PDA:

```text
[b"builderloop_authority", builderloop_program_id]
```

CampaignConfig stores the exact source authority public key.

A meaningful challenge requires user signer, existing BuildSubmission, matching challenge ID, nonzero artifact hash, same project_id, and one-time Completion. It then performs CPI.

## 5. Artifact Lineage

Module commits:

```text
project_seed_hash = hash(initial project seed/spec artifact)
project_id = hash(domain || campaign || user || project_seed_hash)
```

Fix exact domain and serialization; cover with Rust/TypeScript vectors.

Ship Completion contains same project_id and nonzero artifact_hash. Reject mismatches.

## 6. Attestation

Fixed-width payload:

```text
BUILDERLOOP_MODULE_V1
builderloop_program_id
campaign
user
verifier_epoch
event_id_hash
project_id
project_seed_hash
metadata_hash
expires_at
```

Requirements:
- fixed domain;
- exact program/campaign/user;
- current epoch;
- fixed namespace/version from config;
- expiration;
- deterministic bytes;
- Ed25519 instruction inspection;
- malformed offsets/substitution rejection;
- public JSON artifact and vectors.

User cannot choose namespace/version.

## 7. Time and period gates

Use Solana Clock only.

Valid Ship:

```text
current_period >= module_period + min_period_gap
Clock.now - module_finalized_at >= min_elapsed_seconds
```

Use checked arithmetic. Short local fixtures are allowed; fake live evidence is not.

## 8. Instructions

Campaign:
- create_campaign
- freeze_campaign
- start_campaign
- pause_actions
- resume_actions
- deactivate_verifier
- finalize_campaign

User/Module:
- init_user
- submit_module_attestation
- cancel_pending_module
- finalize_module

Ship:
- record_native_ship

Reward:
- create_reward
- fund_reward
- activate_reward
- pause_reward
- resume_reward
- claim_reward
- withdraw_remaining_inventory
- close_reward

Reference program:
- create_challenge
- create_build_submission
- complete_build

Names may follow existing repository conventions; semantics must remain.

## 9. Native Ship validation

Validate:
- campaign active/not paused;
- user signer;
- correct campaign/user accounts;
- stage ModuleFinalized;
- source owner/program/authority;
- Completion discriminator/PDA/layout;
- same user;
- matching challenge/project;
- completed=true;
- nonzero artifact hash;
- time and period gates;
- no previous Ship.

Store artifact/timestamp/period, set Shipped, emit event.

## 10. Reward lifecycle

Expected order:

```text
create -> fund -> activate -> claim -> withdraw remainder -> close
```

Requirements:
- snapshot config hash;
- frozen reward authority;
- canonical vault/mint/token program;
- Reward PDA controls vault;
- fixed amount;
- activation checks funding/window;
- claim checks Shipped and config hash;
- signer-owned recipient token account;
- checked counters/balances;
- duplicate Claim fails;
- withdrawal after deadline only;
- close after empty terminal state;
- explicit rent destinations.

Use fixed SPL payout or labeled test payout, not an access pass.

## 11. Frontend

Only three screens:

Campaign:
- authorities and role labels;
- dates/path/gaps;
- config hash/verifier/source program;
- reward funding;
- privacy disclosure.

Progress:
- stage and project commitment;
- completed gates;
- exact lock reason;
- earliest eligible time;
- period requirement;
- artifact and links.

Reward:
- authority label;
- config snapshot;
- mint/amount/remaining/window/vault/status;
- claim button.

No generic admin dashboard.

## 12. CLI

Commands/equivalents:
- campaign create/freeze/start;
- issue/inspect Module attestation;
- cancel pending Module;
- deactivate verifier;
- reward create/fund/activate;
- export evidence.

Use shared serialization/hashing vectors.

## 13. Evidence

Create:
- evidence/campaign-config.json
- evidence/config-hash.txt
- evidence/module-attestation.json
- evidence/canonicalization-vectors.json
- evidence/devnet-addresses.json
- evidence/transaction-links.json
- evidence/test-summary.md
- docs/ARCHITECTURE.md
- docs/THREAT_MODEL.md
- docs/TRUST_MODEL.md
- docs/DEMO.md
- DEPLOY.md

Never invent unavailable Devnet evidence.
