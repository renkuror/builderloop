use builderloop_protocol_core::{
    attestation_bytes, attestation_hash, config_bytes, config_hash, period_for, project_id,
    required_reward_inventory, validate_campaign_config, CampaignConfig, ModuleAttestation,
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

fn hash(value: &str) -> [u8; 32] {
    let mut output = [0; 32];
    for (index, pair) in value.as_bytes().chunks_exact(2).enumerate() {
        let text = core::str::from_utf8(pair).expect("hex is ASCII");
        output[index] = u8::from_str_radix(text, 16).expect("hex vector is valid");
    }
    output
}
