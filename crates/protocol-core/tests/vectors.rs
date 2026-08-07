use builderloop_protocol_core::{
    apply_loyalty_activity, attestation_bytes, attestation_hash, config_bytes, config_hash,
    effective_loyalty, first_loyalty_activity, heartbeat_activity_bytes, heartbeat_activity_hash,
    heartbeat_config_bytes, heartbeat_config_hash, period_for, project_id,
    required_reward_inventory, tier_for_score, validate_campaign_config, validate_heartbeat_policy,
    CampaignConfig, HeartbeatActivity, HeartbeatPolicy, LoyaltyTier, ModuleAttestation,
    ProtocolError, Pubkey,
};

const KEY_A: Pubkey = [1; 32];
const KEY_B: Pubkey = [2; 32];
const KEY_C: Pubkey = [3; 32];
const KEY_D: Pubkey = [4; 32];
const KEY_E: Pubkey = [5; 32];

fn fixture() -> CampaignConfig {
    CampaignConfig {
        authority: KEY_A,
        campaign_id: 7,
        verifier: KEY_B,
        verifier_epoch: 3,
        verifier_active: true,
        reward_authority: KEY_C,
        start_ts: 1_000,
        end_ts: 1_480,
        period_seconds: 120,
        total_periods: 4,
        min_period_gap: 1,
        min_elapsed_seconds: 120,
        module_challenge_delay: 30,
        module_namespace: 12,
        canonicalizer_version: 1,
        source_program: KEY_D,
        source_authority: KEY_E,
        challenge_id: 42,
        actions_paused: false,
    }
}

fn heartbeat_fixture() -> HeartbeatPolicy {
    HeartbeatPolicy {
        builderloop_program_id: KEY_D,
        campaign: KEY_A,
        campaign_config_hash: [6; 32],
        authority: KEY_A,
        verifier: KEY_B,
        verifier_epoch: 3,
        heartbeat_seconds: 20,
        minimum_return_interval: 15,
        active_credit: 300,
        streak_bonus: 50,
        streak_bonus_cap: 4,
        decay_per_missed_period: 200,
        bronze_threshold: 0,
        silver_threshold: 300,
        gold_threshold: 600,
        platinum_threshold: 850,
        policy_epoch: 1,
        activated_at: 1_000,
    }
}

#[test]
fn serializes_config_and_hashes_it_deterministically() {
    let config = fixture();
    assert_eq!(config_bytes(&config).expect("valid config").len(), 249);
    assert_eq!(
        config_hash(&config).expect("valid config"),
        hash("916ad27666fd9a6c98a84affcc11497908840b8d9c4b060c3b31aa7af6980c7e")
    );
}

#[test]
fn derives_project_and_period_at_valid_boundaries() {
    let config = fixture();
    assert_eq!(period_for(&config, 1_120).expect("period"), 1);
    assert_eq!(
        project_id(KEY_D, KEY_A, KEY_B, [9; 32]),
        hash("71e340d783afcac7e744853fc61a518c16b5820b4e4f4e375e28a88fb30a2762")
    );
}

#[test]
fn serializes_attestation_in_the_shared_fixed_width_layout() {
    let payload = ModuleAttestation {
        builderloop_program_id: KEY_D,
        campaign: KEY_A,
        user: KEY_B,
        verifier_epoch: 3,
        event_id_hash: [7; 32],
        project_id: project_id(KEY_D, KEY_A, KEY_B, [9; 32]),
        project_seed_hash: [9; 32],
        metadata_hash: [8; 32],
        expires_at: 2_000,
    };
    assert_eq!(attestation_bytes(&payload).len(), 257);
    assert_eq!(
        attestation_hash(&payload),
        hash("0514666544cdca4ff5660ca1fd4600dc1283b8a440e69c1f66caed09c16a3b7d")
    );
}

#[test]
fn rejects_invalid_schedule_boundaries_and_reward_overflow() {
    let mut config = fixture();
    config.period_seconds = 0;
    assert_eq!(
        validate_campaign_config(&config),
        Err(ProtocolError::InvalidSchedule)
    );
    assert_eq!(
        period_for(&fixture(), 1_480),
        Err(ProtocolError::TimestampOutsideCampaign)
    );
    assert_eq!(
        required_reward_inventory(0, 1),
        Err(ProtocolError::InvalidTiming)
    );
    assert_eq!(
        required_reward_inventory(u64::MAX, 2),
        Err(ProtocolError::ArithmeticOverflow)
    );
}

#[test]
fn heartbeat_policy_and_activity_layouts_match_the_javascript_vectors() {
    let policy = heartbeat_fixture();
    assert_eq!(
        heartbeat_config_bytes(&policy).expect("valid policy").len(),
        239
    );
    assert_eq!(
        heartbeat_config_hash(&policy).expect("valid policy"),
        hash("c9d7b8f023f99c7c3351f0f310f4c5e75631269e392703466474e7a6543d8c1f")
    );
    let activity = HeartbeatActivity {
        builderloop_program_id: KEY_D,
        loyalty_config: KEY_C,
        campaign: KEY_A,
        wallet: KEY_E,
        verifier: KEY_B,
        verifier_epoch: 3,
        policy_epoch: 1,
        activity_kind: 1,
        activity_id_hash: [7; 32],
        metadata_hash: [8; 32],
        issued_at: 1_000,
        expires_at: 1_060,
    };
    assert_eq!(
        heartbeat_activity_bytes(&activity)
            .expect("valid activity")
            .len(),
        283
    );
    assert_eq!(
        heartbeat_activity_hash(&activity).expect("valid activity"),
        hash("a0c40318600fbf3866fb6bc856418d188612f72b8bd95befbda5513205acdadc")
    );
}

#[test]
fn heartbeat_loyalty_transitions_are_constant_time_and_bounded() {
    let policy = heartbeat_fixture();
    let first = first_loyalty_activity(&policy).expect("first activity");
    assert_eq!(first.score, 350);
    assert_eq!(first.streak, 1);
    assert_eq!(
        apply_loyalty_activity(first.score, first.streak, 1_000, 1_010, &policy),
        Err(ProtocolError::ActivityTooEarly)
    );
    let second = apply_loyalty_activity(first.score, first.streak, 1_000, 1_015, &policy)
        .expect("valid return");
    assert_eq!((second.score, second.streak), (750, 2));
    let view =
        effective_loyalty(second.score, second.streak, 1_015, 1_055, &policy).expect("lazy decay");
    assert_eq!((view.elapsed_periods, view.missed_periods), (2, 1));
    assert_eq!((view.effective_score, view.effective_streak), (550, 0));
    assert_eq!(view.next_decay_at, 1_055);
    assert_eq!(
        tier_for_score(view.effective_score, &policy),
        Ok(LoyaltyTier::Silver)
    );
    let capped = apply_loyalty_activity(0, u16::MAX, 1_000, 1_015, &policy)
        .expect("capped historical streak");
    assert_eq!((capped.score, capped.streak), (500, u16::MAX));
    let exhausted = effective_loyalty(1, 99, 1_000, i64::MAX, &policy).expect("O(1) saturation");
    assert_eq!(exhausted.effective_score, 0);
}

#[test]
fn heartbeat_policy_rejects_unsafe_timing_thresholds_and_credit() {
    let policy = heartbeat_fixture();
    assert_eq!(
        validate_heartbeat_policy(&HeartbeatPolicy {
            heartbeat_seconds: 0,
            ..policy.clone()
        }),
        Err(ProtocolError::InvalidHeartbeatPolicy)
    );
    assert_eq!(
        validate_heartbeat_policy(&HeartbeatPolicy {
            minimum_return_interval: 21,
            ..policy.clone()
        }),
        Err(ProtocolError::InvalidHeartbeatPolicy)
    );
    assert_eq!(
        validate_heartbeat_policy(&HeartbeatPolicy {
            gold_threshold: 300,
            ..policy.clone()
        }),
        Err(ProtocolError::InvalidTierThresholds)
    );
    assert_eq!(
        validate_heartbeat_policy(&HeartbeatPolicy {
            active_credit: 900,
            ..policy
        }),
        Err(ProtocolError::InvalidScoreParameters)
    );
}

fn hash(value: &str) -> [u8; 32] {
    let mut output = [0; 32];
    for (index, pair) in value.as_bytes().chunks_exact(2).enumerate() {
        let text = core::str::from_utf8(pair).expect("hex is ASCII");
        output[index] = u8::from_str_radix(text, 16).expect("hex vector is valid");
    }
    output
}
