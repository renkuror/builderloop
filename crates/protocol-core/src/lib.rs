//! Deterministic BuilderLoop protocol primitives.
//!
//! This crate intentionally has no network or validator dependency. It defines
//! the byte layouts and checked arithmetic that the on-chain programs must use.

use core::fmt;

pub const CONFIG_DOMAIN: &[u8] = b"BUILDERLOOP_CONFIG_V1";
pub const PROJECT_DOMAIN: &[u8] = b"BUILDERLOOP_PROJECT_V1";
pub const MODULE_DOMAIN: &[u8] = b"BUILDERLOOP_MODULE_V1";
pub const HEARTBEAT_CONFIG_DOMAIN: &[u8] = b"BUILDERLOOP_HEARTBEAT_CONFIG_V1";
pub const HEARTBEAT_ACTIVITY_DOMAIN: &[u8] = b"BUILDERLOOP_HEARTBEAT_ACTIVITY_V1";
pub const MAX_LOYALTY_SCORE: u16 = 1_000;
pub type Pubkey = [u8; 32];
pub type Hash = [u8; 32];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProtocolError {
    DefaultKey,
    InvalidSchedule,
    InvalidPeriod,
    InvalidGap,
    InvalidTiming,
    InvalidHeartbeatPolicy,
    InvalidTierThresholds,
    InvalidScoreParameters,
    TimestampBeforeActivity,
    ActivityTooEarly,
    ArithmeticOverflow,
    TimestampOutsideCampaign,
}

impl fmt::Display for ProtocolError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::DefaultKey => "a critical public key must be non-default",
            Self::InvalidSchedule => "campaign schedule is invalid",
            Self::InvalidPeriod => "period is invalid or outside campaign range",
            Self::InvalidGap => "minimum period gap is invalid",
            Self::InvalidTiming => "timing gate is invalid",
            Self::InvalidHeartbeatPolicy => "heartbeat policy is invalid",
            Self::InvalidTierThresholds => "loyalty tier thresholds are invalid",
            Self::InvalidScoreParameters => "loyalty score parameters are invalid",
            Self::TimestampBeforeActivity => "timestamp precedes the last meaningful activity",
            Self::ActivityTooEarly => "activity is before the minimum return interval",
            Self::ArithmeticOverflow => "checked arithmetic overflowed",
            Self::TimestampOutsideCampaign => "timestamp is outside campaign window",
        })
    }
}

impl std::error::Error for ProtocolError {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CampaignConfig {
    pub authority: Pubkey,
    pub campaign_id: u64,
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
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModuleAttestation {
    pub builderloop_program_id: Pubkey,
    pub campaign: Pubkey,
    pub user: Pubkey,
    pub verifier_epoch: u32,
    pub event_id_hash: Hash,
    pub project_id: Hash,
    pub project_seed_hash: Hash,
    pub metadata_hash: Hash,
    pub expires_at: i64,
}

/// Immutable, campaign-bound parameters for heartbeat-normalized loyalty.
/// The program stores the hash of this fixed-width layout after validation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HeartbeatPolicy {
    pub builderloop_program_id: Pubkey,
    pub campaign: Pubkey,
    pub campaign_config_hash: Hash,
    pub authority: Pubkey,
    pub verifier: Pubkey,
    pub verifier_epoch: u32,
    pub heartbeat_seconds: i64,
    pub minimum_return_interval: i64,
    pub active_credit: u16,
    pub streak_bonus: u16,
    pub streak_bonus_cap: u16,
    pub decay_per_missed_period: u16,
    pub bronze_threshold: u16,
    pub silver_threshold: u16,
    pub gold_threshold: u16,
    pub platinum_threshold: u16,
    pub policy_epoch: u32,
    pub activated_at: i64,
}

/// Fixed-width, verifier-signed meaningful activity voucher.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HeartbeatActivity {
    pub builderloop_program_id: Pubkey,
    pub loyalty_config: Pubkey,
    pub campaign: Pubkey,
    pub wallet: Pubkey,
    pub verifier: Pubkey,
    pub verifier_epoch: u32,
    pub policy_epoch: u32,
    pub activity_kind: u16,
    pub activity_id_hash: Hash,
    pub metadata_hash: Hash,
    pub issued_at: i64,
    pub expires_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum LoyaltyTier {
    Bronze = 0,
    Silver = 1,
    Gold = 2,
    Platinum = 3,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LoyaltyView {
    pub effective_score: u16,
    pub effective_streak: u16,
    pub elapsed_periods: u64,
    pub missed_periods: u64,
    pub next_decay_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LoyaltyTransition {
    pub score: u16,
    pub streak: u16,
    pub elapsed_periods: u64,
    pub missed_periods: u64,
}

pub fn validate_campaign_config(config: &CampaignConfig) -> Result<(), ProtocolError> {
    for key in [
        config.authority,
        config.verifier,
        config.reward_authority,
        config.source_program,
        config.source_authority,
    ] {
        if key == [0; 32] {
            return Err(ProtocolError::DefaultKey);
        }
    }
    if config.start_ts >= config.end_ts || config.period_seconds <= 0 || config.total_periods == 0 {
        return Err(ProtocolError::InvalidSchedule);
    }
    if config.min_elapsed_seconds < 0 || config.module_challenge_delay < 0 {
        return Err(ProtocolError::InvalidTiming);
    }
    if config.min_period_gap >= config.total_periods {
        return Err(ProtocolError::InvalidGap);
    }
    let duration = config
        .end_ts
        .checked_sub(config.start_ts)
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    if duration % config.period_seconds != 0 {
        return Err(ProtocolError::InvalidSchedule);
    }
    let derived_periods = duration
        .checked_div(config.period_seconds)
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    if derived_periods != i64::from(config.total_periods) {
        return Err(ProtocolError::InvalidSchedule);
    }
    Ok(())
}

/// Serializes every eligibility-critical campaign field in frozen order.
pub fn config_bytes(config: &CampaignConfig) -> Result<Vec<u8>, ProtocolError> {
    validate_campaign_config(config)?;
    let mut bytes = Vec::with_capacity(249);
    bytes.extend_from_slice(CONFIG_DOMAIN);
    bytes.extend_from_slice(&config.authority);
    bytes.extend_from_slice(&config.campaign_id.to_le_bytes());
    bytes.extend_from_slice(&config.verifier);
    bytes.extend_from_slice(&config.verifier_epoch.to_le_bytes());
    bytes.push(u8::from(config.verifier_active));
    bytes.extend_from_slice(&config.reward_authority);
    bytes.extend_from_slice(&config.start_ts.to_le_bytes());
    bytes.extend_from_slice(&config.end_ts.to_le_bytes());
    bytes.extend_from_slice(&config.period_seconds.to_le_bytes());
    bytes.push(config.total_periods);
    bytes.push(config.min_period_gap);
    bytes.extend_from_slice(&config.min_elapsed_seconds.to_le_bytes());
    bytes.extend_from_slice(&config.module_challenge_delay.to_le_bytes());
    bytes.extend_from_slice(&config.module_namespace.to_le_bytes());
    bytes.extend_from_slice(&config.canonicalizer_version.to_le_bytes());
    bytes.extend_from_slice(&config.source_program);
    bytes.extend_from_slice(&config.source_authority);
    bytes.extend_from_slice(&config.challenge_id.to_le_bytes());
    bytes.push(u8::from(config.actions_paused));
    Ok(bytes)
}

pub fn config_hash(config: &CampaignConfig) -> Result<Hash, ProtocolError> {
    Ok(sha256(&config_bytes(config)?))
}

pub fn project_id(
    program_id: Pubkey,
    campaign: Pubkey,
    user: Pubkey,
    project_seed_hash: Hash,
) -> Hash {
    let mut bytes = Vec::with_capacity(PROJECT_DOMAIN.len() + 128);
    bytes.extend_from_slice(PROJECT_DOMAIN);
    bytes.extend_from_slice(&program_id);
    bytes.extend_from_slice(&campaign);
    bytes.extend_from_slice(&user);
    bytes.extend_from_slice(&project_seed_hash);
    sha256(&bytes)
}

pub fn attestation_bytes(payload: &ModuleAttestation) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(MODULE_DOMAIN.len() + 32 * 6 + 4 + 8);
    bytes.extend_from_slice(MODULE_DOMAIN);
    bytes.extend_from_slice(&payload.builderloop_program_id);
    bytes.extend_from_slice(&payload.campaign);
    bytes.extend_from_slice(&payload.user);
    bytes.extend_from_slice(&payload.verifier_epoch.to_le_bytes());
    bytes.extend_from_slice(&payload.event_id_hash);
    bytes.extend_from_slice(&payload.project_id);
    bytes.extend_from_slice(&payload.project_seed_hash);
    bytes.extend_from_slice(&payload.metadata_hash);
    bytes.extend_from_slice(&payload.expires_at.to_le_bytes());
    bytes
}

pub fn attestation_hash(payload: &ModuleAttestation) -> Hash {
    sha256(&attestation_bytes(payload))
}

pub fn validate_heartbeat_policy(policy: &HeartbeatPolicy) -> Result<(), ProtocolError> {
    for key in [
        policy.builderloop_program_id,
        policy.campaign,
        policy.authority,
        policy.verifier,
    ] {
        if key == [0; 32] {
            return Err(ProtocolError::DefaultKey);
        }
    }
    if policy.heartbeat_seconds <= 0
        || policy.minimum_return_interval <= 0
        || policy.minimum_return_interval > policy.heartbeat_seconds
        || policy.policy_epoch == 0
    {
        return Err(ProtocolError::InvalidHeartbeatPolicy);
    }
    if policy.active_credit == 0
        || policy.streak_bonus_cap == 0
        || policy.decay_per_missed_period == 0
    {
        return Err(ProtocolError::InvalidScoreParameters);
    }
    let maximum_credit = u32::from(policy.active_credit)
        .checked_add(
            u32::from(policy.streak_bonus)
                .checked_mul(u32::from(policy.streak_bonus_cap))
                .ok_or(ProtocolError::ArithmeticOverflow)?,
        )
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    if maximum_credit > u32::from(MAX_LOYALTY_SCORE) {
        return Err(ProtocolError::InvalidScoreParameters);
    }
    if policy.bronze_threshold != 0
        || policy.silver_threshold <= policy.bronze_threshold
        || policy.gold_threshold <= policy.silver_threshold
        || policy.platinum_threshold <= policy.gold_threshold
        || policy.platinum_threshold > MAX_LOYALTY_SCORE
    {
        return Err(ProtocolError::InvalidTierThresholds);
    }
    Ok(())
}

/// Serializes every loyalty-eligibility field in frozen order.
pub fn heartbeat_config_bytes(policy: &HeartbeatPolicy) -> Result<Vec<u8>, ProtocolError> {
    validate_heartbeat_policy(policy)?;
    let mut bytes = Vec::with_capacity(32 * 5 + 32 + 4 + 8 * 3 + 2 * 8 + 4);
    bytes.extend_from_slice(HEARTBEAT_CONFIG_DOMAIN);
    bytes.extend_from_slice(&policy.builderloop_program_id);
    bytes.extend_from_slice(&policy.campaign);
    bytes.extend_from_slice(&policy.campaign_config_hash);
    bytes.extend_from_slice(&policy.authority);
    bytes.extend_from_slice(&policy.verifier);
    bytes.extend_from_slice(&policy.verifier_epoch.to_le_bytes());
    bytes.extend_from_slice(&policy.heartbeat_seconds.to_le_bytes());
    bytes.extend_from_slice(&policy.minimum_return_interval.to_le_bytes());
    bytes.extend_from_slice(&policy.active_credit.to_le_bytes());
    bytes.extend_from_slice(&policy.streak_bonus.to_le_bytes());
    bytes.extend_from_slice(&policy.streak_bonus_cap.to_le_bytes());
    bytes.extend_from_slice(&policy.decay_per_missed_period.to_le_bytes());
    bytes.extend_from_slice(&policy.bronze_threshold.to_le_bytes());
    bytes.extend_from_slice(&policy.silver_threshold.to_le_bytes());
    bytes.extend_from_slice(&policy.gold_threshold.to_le_bytes());
    bytes.extend_from_slice(&policy.platinum_threshold.to_le_bytes());
    bytes.extend_from_slice(&policy.policy_epoch.to_le_bytes());
    bytes.extend_from_slice(&policy.activated_at.to_le_bytes());
    Ok(bytes)
}

pub fn heartbeat_config_hash(policy: &HeartbeatPolicy) -> Result<Hash, ProtocolError> {
    Ok(sha256(&heartbeat_config_bytes(policy)?))
}

pub fn heartbeat_activity_bytes(activity: &HeartbeatActivity) -> Result<Vec<u8>, ProtocolError> {
    for key in [
        activity.builderloop_program_id,
        activity.loyalty_config,
        activity.campaign,
        activity.wallet,
        activity.verifier,
    ] {
        if key == [0; 32] {
            return Err(ProtocolError::DefaultKey);
        }
    }
    if activity.policy_epoch == 0 || activity.activity_kind == 0 {
        return Err(ProtocolError::InvalidHeartbeatPolicy);
    }
    if activity.issued_at > activity.expires_at {
        return Err(ProtocolError::InvalidTiming);
    }
    let mut bytes =
        Vec::with_capacity(HEARTBEAT_ACTIVITY_DOMAIN.len() + 32 * 7 + 4 * 2 + 2 + 8 * 2);
    bytes.extend_from_slice(HEARTBEAT_ACTIVITY_DOMAIN);
    bytes.extend_from_slice(&activity.builderloop_program_id);
    bytes.extend_from_slice(&activity.loyalty_config);
    bytes.extend_from_slice(&activity.campaign);
    bytes.extend_from_slice(&activity.wallet);
    bytes.extend_from_slice(&activity.verifier);
    bytes.extend_from_slice(&activity.verifier_epoch.to_le_bytes());
    bytes.extend_from_slice(&activity.policy_epoch.to_le_bytes());
    bytes.extend_from_slice(&activity.activity_kind.to_le_bytes());
    bytes.extend_from_slice(&activity.activity_id_hash);
    bytes.extend_from_slice(&activity.metadata_hash);
    bytes.extend_from_slice(&activity.issued_at.to_le_bytes());
    bytes.extend_from_slice(&activity.expires_at.to_le_bytes());
    Ok(bytes)
}

pub fn heartbeat_activity_hash(activity: &HeartbeatActivity) -> Result<Hash, ProtocolError> {
    Ok(sha256(&heartbeat_activity_bytes(activity)?))
}

pub fn elapsed_heartbeat_periods(
    last_meaningful_activity_at: i64,
    now: i64,
    heartbeat_seconds: i64,
) -> Result<u64, ProtocolError> {
    if heartbeat_seconds <= 0 {
        return Err(ProtocolError::InvalidHeartbeatPolicy);
    }
    let elapsed = now
        .checked_sub(last_meaningful_activity_at)
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    if elapsed < 0 {
        return Err(ProtocolError::TimestampBeforeActivity);
    }
    u64::try_from(elapsed / heartbeat_seconds).map_err(|_| ProtocolError::ArithmeticOverflow)
}

pub fn missed_heartbeat_periods(elapsed_periods: u64) -> u64 {
    elapsed_periods.saturating_sub(1)
}

pub fn tier_for_score(score: u16, policy: &HeartbeatPolicy) -> Result<LoyaltyTier, ProtocolError> {
    validate_heartbeat_policy(policy)?;
    if score > MAX_LOYALTY_SCORE {
        return Err(ProtocolError::InvalidScoreParameters);
    }
    Ok(if score >= policy.platinum_threshold {
        LoyaltyTier::Platinum
    } else if score >= policy.gold_threshold {
        LoyaltyTier::Gold
    } else if score >= policy.silver_threshold {
        LoyaltyTier::Silver
    } else {
        LoyaltyTier::Bronze
    })
}

pub fn effective_loyalty(
    score_at_last_settlement: u16,
    streak: u16,
    last_meaningful_activity_at: i64,
    now: i64,
    policy: &HeartbeatPolicy,
) -> Result<LoyaltyView, ProtocolError> {
    validate_heartbeat_policy(policy)?;
    if score_at_last_settlement > MAX_LOYALTY_SCORE {
        return Err(ProtocolError::InvalidScoreParameters);
    }
    let elapsed_periods =
        elapsed_heartbeat_periods(last_meaningful_activity_at, now, policy.heartbeat_seconds)?;
    let missed_periods = missed_heartbeat_periods(elapsed_periods);
    let decay = missed_periods.saturating_mul(u64::from(policy.decay_per_missed_period));
    let effective_score = u64::from(score_at_last_settlement)
        .saturating_sub(decay)
        .min(u64::from(MAX_LOYALTY_SCORE));
    let effective_score =
        u16::try_from(effective_score).map_err(|_| ProtocolError::ArithmeticOverflow)?;
    let next_decay_at = last_meaningful_activity_at
        .checked_add(
            policy
                .heartbeat_seconds
                .checked_mul(2)
                .ok_or(ProtocolError::ArithmeticOverflow)?,
        )
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    Ok(LoyaltyView {
        effective_score,
        effective_streak: if missed_periods == 0 { streak } else { 0 },
        elapsed_periods,
        missed_periods,
        next_decay_at,
    })
}

fn activity_credit(streak: u16, policy: &HeartbeatPolicy) -> Result<u16, ProtocolError> {
    let capped_streak = u32::from(streak.min(policy.streak_bonus_cap));
    let bonus = u32::from(policy.streak_bonus)
        .checked_mul(capped_streak)
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    let credit = u32::from(policy.active_credit)
        .checked_add(bonus)
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    u16::try_from(credit).map_err(|_| ProtocolError::ArithmeticOverflow)
}

pub fn first_loyalty_activity(
    policy: &HeartbeatPolicy,
) -> Result<LoyaltyTransition, ProtocolError> {
    validate_heartbeat_policy(policy)?;
    let streak = 1;
    Ok(LoyaltyTransition {
        score: activity_credit(streak, policy)?,
        streak,
        elapsed_periods: 0,
        missed_periods: 0,
    })
}

pub fn apply_loyalty_activity(
    score_at_last_settlement: u16,
    streak: u16,
    last_meaningful_activity_at: i64,
    now: i64,
    policy: &HeartbeatPolicy,
) -> Result<LoyaltyTransition, ProtocolError> {
    validate_heartbeat_policy(policy)?;
    let elapsed = now
        .checked_sub(last_meaningful_activity_at)
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    if elapsed < 0 {
        return Err(ProtocolError::TimestampBeforeActivity);
    }
    if elapsed < policy.minimum_return_interval {
        return Err(ProtocolError::ActivityTooEarly);
    }
    let view = effective_loyalty(
        score_at_last_settlement,
        streak,
        last_meaningful_activity_at,
        now,
        policy,
    )?;
    let next_streak = if view.missed_periods == 0 {
        streak.saturating_add(1)
    } else {
        1
    };
    let score = u32::from(view.effective_score)
        .checked_add(u32::from(activity_credit(next_streak, policy)?))
        .ok_or(ProtocolError::ArithmeticOverflow)?
        .min(u32::from(MAX_LOYALTY_SCORE));
    Ok(LoyaltyTransition {
        score: u16::try_from(score).map_err(|_| ProtocolError::ArithmeticOverflow)?,
        streak: next_streak,
        elapsed_periods: view.elapsed_periods,
        missed_periods: view.missed_periods,
    })
}

pub fn period_for(config: &CampaignConfig, timestamp: i64) -> Result<u8, ProtocolError> {
    validate_campaign_config(config)?;
    if timestamp < config.start_ts || timestamp >= config.end_ts {
        return Err(ProtocolError::TimestampOutsideCampaign);
    }
    let elapsed = timestamp
        .checked_sub(config.start_ts)
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    let period = elapsed
        .checked_div(config.period_seconds)
        .ok_or(ProtocolError::ArithmeticOverflow)?;
    if period < 0 || period >= i64::from(config.total_periods) {
        return Err(ProtocolError::InvalidPeriod);
    }
    u8::try_from(period).map_err(|_| ProtocolError::InvalidPeriod)
}

pub fn required_reward_inventory(
    amount_per_claim: u64,
    max_claims: u32,
) -> Result<u64, ProtocolError> {
    if amount_per_claim == 0 || max_claims == 0 {
        return Err(ProtocolError::InvalidTiming);
    }
    amount_per_claim
        .checked_mul(u64::from(max_claims))
        .ok_or(ProtocolError::ArithmeticOverflow)
}

/// Minimal dependency-free SHA-256 implementation for deterministic vectors.
pub fn sha256(message: &[u8]) -> Hash {
    const INITIAL: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let bit_len = (message.len() as u64).wrapping_mul(8);
    let mut padded = Vec::from(message);
    padded.push(0x80);
    while (padded.len() + 8) % 64 != 0 {
        padded.push(0);
    }
    padded.extend_from_slice(&bit_len.to_be_bytes());

    let mut state = INITIAL;
    for chunk in padded.chunks_exact(64) {
        let mut words = [0u32; 64];
        for (index, word) in words.iter_mut().take(16).enumerate() {
            let offset = index * 4;
            *word = (u32::from(chunk[offset]) << 24)
                | (u32::from(chunk[offset + 1]) << 16)
                | (u32::from(chunk[offset + 2]) << 8)
                | u32::from(chunk[offset + 3]);
        }
        for index in 16..64 {
            let small_sigma0 = words[index - 15].rotate_right(7)
                ^ words[index - 15].rotate_right(18)
                ^ (words[index - 15] >> 3);
            let small_sigma1 = words[index - 2].rotate_right(17)
                ^ words[index - 2].rotate_right(19)
                ^ (words[index - 2] >> 10);
            words[index] = words[index - 16]
                .wrapping_add(small_sigma0)
                .wrapping_add(words[index - 7])
                .wrapping_add(small_sigma1);
        }
        let mut working = state;
        for index in 0..64 {
            let big_sigma1 = working[4].rotate_right(6)
                ^ working[4].rotate_right(11)
                ^ working[4].rotate_right(25);
            let choose = (working[4] & working[5]) ^ ((!working[4]) & working[6]);
            let temp1 = working[7]
                .wrapping_add(big_sigma1)
                .wrapping_add(choose)
                .wrapping_add(K[index])
                .wrapping_add(words[index]);
            let big_sigma0 = working[0].rotate_right(2)
                ^ working[0].rotate_right(13)
                ^ working[0].rotate_right(22);
            let majority =
                (working[0] & working[1]) ^ (working[0] & working[2]) ^ (working[1] & working[2]);
            let temp2 = big_sigma0.wrapping_add(majority);
            working = [
                temp1.wrapping_add(temp2),
                working[0],
                working[1],
                working[2],
                working[3].wrapping_add(temp1),
                working[4],
                working[5],
                working[6],
            ];
        }
        for (target, value) in state.iter_mut().zip(working) {
            *target = target.wrapping_add(value);
        }
    }
    let mut output = [0u8; 32];
    for (index, word) in state.into_iter().enumerate() {
        output[index * 4..index * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    output
}

#[cfg(test)]
mod tests {
    use super::sha256;

    #[test]
    fn sha256_matches_standard_vector() {
        assert_eq!(
            sha256(b"abc"),
            [
                0xba, 0x78, 0x16, 0xbf, 0x8f, 0x01, 0xcf, 0xea, 0x41, 0x41, 0x40, 0xde, 0x5d, 0xae,
                0x22, 0x23, 0xb0, 0x03, 0x61, 0xa3, 0x96, 0x17, 0x7a, 0x9c, 0xb4, 0x10, 0xff, 0x61,
                0xf2, 0x00, 0x15, 0xad,
            ]
        );
    }
}
