#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions;
use anchor_spl::token_interface::{
    self, CloseAccount, Mint, TokenAccount, TokenInterface, TransferChecked,
};
use solana_sdk_ids::ed25519_program;
use solana_sha256_hasher::hash;

declare_id!("3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2");

pub const CAMPAIGN_SEED: &[u8] = b"campaign";
pub const USER_SEED: &[u8] = b"user";
pub const MODULE_SEED: &[u8] = b"module";
pub const REWARD_SEED: &[u8] = b"reward";
pub const CLAIM_SEED: &[u8] = b"claim";
pub const VAULT_SEED: &[u8] = b"vault";
pub const CONFIG_DOMAIN: &[u8] = b"BUILDERLOOP_CONFIG_V1";
pub const MODULE_DOMAIN: &[u8] = b"BUILDERLOOP_MODULE_V1";
pub const PROJECT_DOMAIN: &[u8] = b"BUILDERLOOP_PROJECT_V1";
pub const COMPLETION_DISCRIMINATOR: [u8; 8] = [122, 228, 30, 216, 217, 48, 88, 215];

#[program]
pub mod builderloop {
    use super::*;

    pub fn create_campaign(ctx: Context<CreateCampaign>, args: CreateCampaignArgs) -> Result<()> {
        validate_campaign_args(&args)?;
        let campaign = &mut ctx.accounts.campaign;
        campaign.authority = ctx.accounts.authority.key();
        campaign.campaign_id = args.campaign_id;
        campaign.status = CampaignStatus::Draft;
        campaign.verifier = args.verifier;
        campaign.verifier_epoch = 0;
        campaign.verifier_active = true;
        campaign.reward_authority = args.reward_authority;
        campaign.start_ts = args.start_ts;
        campaign.end_ts = args.end_ts;
        campaign.period_seconds = args.period_seconds;
        campaign.total_periods = args.total_periods;
        campaign.min_period_gap = args.min_period_gap;
        campaign.min_elapsed_seconds = args.min_elapsed_seconds;
        campaign.module_challenge_delay = args.module_challenge_delay;
        campaign.module_namespace = args.module_namespace;
        campaign.canonicalizer_version = args.canonicalizer_version;
        campaign.source_program = args.source_program;
        campaign.source_authority = args.source_authority;
        campaign.challenge_id = args.challenge_id;
        campaign.actions_paused = false;
        campaign.config_hash = [0; 32];
        campaign.bump = ctx.bumps.campaign;
        Ok(())
    }

    pub fn freeze_campaign(ctx: Context<CampaignAuthority>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.status == CampaignStatus::Draft,
            BuilderLoopError::InvalidCampaignStatus
        );
        campaign.config_hash = campaign_hash(campaign)?;
        campaign.status = CampaignStatus::Frozen;
        emit!(CampaignFrozen {
            campaign: campaign.key(),
            config_hash: campaign.config_hash
        });
        Ok(())
    }

    pub fn start_campaign(ctx: Context<CampaignAuthority>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.status == CampaignStatus::Frozen,
            BuilderLoopError::InvalidCampaignStatus
        );
        campaign.status = CampaignStatus::Active;
        Ok(())
    }

    pub fn pause_actions(ctx: Context<CampaignAuthority>) -> Result<()> {
        require!(
            ctx.accounts.campaign.status == CampaignStatus::Active,
            BuilderLoopError::InvalidCampaignStatus
        );
        ctx.accounts.campaign.actions_paused = true;
        Ok(())
    }

    pub fn resume_actions(ctx: Context<CampaignAuthority>) -> Result<()> {
        require!(
            ctx.accounts.campaign.status == CampaignStatus::Active,
            BuilderLoopError::InvalidCampaignStatus
        );
        ctx.accounts.campaign.actions_paused = false;
        Ok(())
    }

    pub fn deactivate_verifier(ctx: Context<CampaignAuthority>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            matches!(
                campaign.status,
                CampaignStatus::Frozen | CampaignStatus::Active
            ),
            BuilderLoopError::InvalidCampaignStatus
        );
        require!(campaign.verifier_active, BuilderLoopError::VerifierInactive);
        campaign.verifier_active = false;
        campaign.verifier_epoch = campaign
            .verifier_epoch
            .checked_add(1)
            .ok_or(BuilderLoopError::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn finalize_campaign(ctx: Context<CampaignAuthority>) -> Result<()> {
        ctx.accounts.campaign.status = CampaignStatus::Finalized;
        ctx.accounts.campaign.actions_paused = true;
        Ok(())
    }

    pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
        assert_campaign_actionable(&ctx.accounts.campaign)?;
        let user = &mut ctx.accounts.user_progress;
        user.campaign = ctx.accounts.campaign.key();
        user.wallet = ctx.accounts.wallet.key();
        user.stage = UserStage::Initialized;
        user.project_id = [0; 32];
        user.project_seed_hash = [0; 32];
        user.module_event_hash = [0; 32];
        user.module_finalized_at = 0;
        user.module_period = 0;
        user.artifact_hash = [0; 32];
        user.ship_completed_at = 0;
        user.ship_period = 0;
        user.bump = ctx.bumps.user_progress;
        Ok(())
    }

    pub fn submit_module_attestation(
        ctx: Context<SubmitModule>,
        args: ModuleVoucher,
    ) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        assert_campaign_actionable(campaign)?;
        require!(campaign.verifier_active, BuilderLoopError::VerifierInactive);
        require!(
            args.verifier_epoch == campaign.verifier_epoch,
            BuilderLoopError::VerifierEpochMismatch
        );
        require!(
            args.expires_at >= Clock::get()?.unix_timestamp,
            BuilderLoopError::VoucherExpired
        );
        require!(
            args.event_id_hash != [0; 32] && args.project_seed_hash != [0; 32],
            BuilderLoopError::ZeroHash
        );
        let expected_project = project_id(
            ctx.accounts.campaign.key(),
            ctx.accounts.wallet.key(),
            args.project_seed_hash,
        );
        require!(
            args.project_id == expected_project,
            BuilderLoopError::ProjectMismatch
        );
        let message = module_message(
            ctx.accounts.campaign.key(),
            ctx.accounts.wallet.key(),
            &args,
        );
        inspect_ed25519(
            &ctx.accounts.instructions.to_account_info(),
            campaign.verifier,
            &message,
        )?;
        let progress = &mut ctx.accounts.user_progress;
        require!(
            progress.stage == UserStage::Initialized,
            BuilderLoopError::InvalidUserStage
        );
        let now = Clock::get()?.unix_timestamp;
        let receipt = &mut ctx.accounts.module_receipt;
        receipt.campaign = campaign.key();
        receipt.user = ctx.accounts.wallet.key();
        receipt.event_id_hash = args.event_id_hash;
        receipt.project_id = args.project_id;
        receipt.project_seed_hash = args.project_seed_hash;
        receipt.metadata_hash = args.metadata_hash;
        receipt.verifier_epoch = args.verifier_epoch;
        receipt.status = ReceiptStatus::Pending;
        receipt.submitted_at = now;
        receipt.finalize_after = now
            .checked_add(campaign.module_challenge_delay)
            .ok_or(BuilderLoopError::ArithmeticOverflow)?;
        receipt.bump = ctx.bumps.module_receipt;
        progress.stage = UserStage::ModulePending;
        progress.module_event_hash = args.event_id_hash;
        Ok(())
    }

    pub fn cancel_pending_module(ctx: Context<PendingModule>) -> Result<()> {
        require!(
            ctx.accounts.module_receipt.status == ReceiptStatus::Pending,
            BuilderLoopError::InvalidReceiptStatus
        );
        require!(
            ctx.accounts.user_progress.stage == UserStage::ModulePending,
            BuilderLoopError::InvalidUserStage
        );
        ctx.accounts.module_receipt.status = ReceiptStatus::Cancelled;
        ctx.accounts.user_progress.stage = UserStage::Initialized;
        ctx.accounts.user_progress.module_event_hash = [0; 32];
        Ok(())
    }

    pub fn finalize_module(ctx: Context<PendingModule>) -> Result<()> {
        assert_campaign_actionable(&ctx.accounts.campaign)?;
        let now = Clock::get()?.unix_timestamp;
        require!(
            ctx.accounts.module_receipt.status == ReceiptStatus::Pending,
            BuilderLoopError::InvalidReceiptStatus
        );
        require!(
            ctx.accounts.module_receipt.verifier_epoch == ctx.accounts.campaign.verifier_epoch,
            BuilderLoopError::StaleReceiptEpoch
        );
        require!(
            now >= ctx.accounts.module_receipt.finalize_after,
            BuilderLoopError::ChallengeDelayActive
        );
        let period = period_for(&ctx.accounts.campaign, now)?;
        let receipt = &mut ctx.accounts.module_receipt;
        receipt.status = ReceiptStatus::Finalized;
        let progress = &mut ctx.accounts.user_progress;
        progress.stage = UserStage::ModuleFinalized;
        progress.project_id = receipt.project_id;
        progress.project_seed_hash = receipt.project_seed_hash;
        progress.module_finalized_at = now;
        progress.module_period = period;
        Ok(())
    }

    pub fn record_native_ship(ctx: Context<RecordNativeShip>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        assert_campaign_actionable(campaign)?;
        let progress = &mut ctx.accounts.user_progress;
        require!(
            progress.stage == UserStage::ModuleFinalized,
            BuilderLoopError::InvalidUserStage
        );
        require_keys_eq!(
            *ctx.accounts.completion.owner,
            campaign.source_program,
            BuilderLoopError::WrongSourceProgram
        );
        require_keys_eq!(
            ctx.accounts.source_authority.key(),
            campaign.source_authority,
            BuilderLoopError::WrongSourceAuthority
        );
        let (expected, completion_bump) = Pubkey::find_program_address(
            &[
                b"completion",
                &campaign.challenge_id.to_le_bytes(),
                ctx.accounts.wallet.key().as_ref(),
            ],
            &campaign.source_program,
        );
        require_keys_eq!(
            ctx.accounts.completion.key(),
            expected,
            BuilderLoopError::WrongCompletionPda
        );
        let completion = read_completion(&ctx.accounts.completion)?;
        require!(
            completion.bump == completion_bump,
            BuilderLoopError::WrongCompletionPda
        );
        require_keys_eq!(
            completion.user,
            ctx.accounts.wallet.key(),
            BuilderLoopError::WalletMismatch
        );
        require!(
            completion.challenge_id == campaign.challenge_id,
            BuilderLoopError::ChallengeMismatch
        );
        require!(
            completion.project_id == progress.project_id,
            BuilderLoopError::ProjectMismatch
        );
        require!(completion.completed, BuilderLoopError::CompletionIncomplete);
        require!(
            completion.artifact_hash != [0; 32],
            BuilderLoopError::ZeroHash
        );
        let now = Clock::get()?.unix_timestamp;
        let elapsed = now
            .checked_sub(progress.module_finalized_at)
            .ok_or(BuilderLoopError::ArithmeticOverflow)?;
        require!(
            elapsed >= campaign.min_elapsed_seconds,
            BuilderLoopError::ElapsedGateActive
        );
        let ship_period = period_for(campaign, now)?;
        let required_period = progress
            .module_period
            .checked_add(campaign.min_period_gap)
            .ok_or(BuilderLoopError::ArithmeticOverflow)?;
        require!(
            ship_period >= required_period,
            BuilderLoopError::PeriodGateActive
        );
        progress.stage = UserStage::Shipped;
        progress.artifact_hash = completion.artifact_hash;
        progress.ship_completed_at = completion.completed_at;
        progress.ship_period = ship_period;
        emit!(ShipRecorded {
            campaign: campaign.key(),
            wallet: ctx.accounts.wallet.key(),
            project_id: progress.project_id,
            artifact_hash: progress.artifact_hash
        });
        Ok(())
    }

    pub fn create_reward(ctx: Context<CreateReward>, args: CreateRewardArgs) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        require!(
            matches!(
                campaign.status,
                CampaignStatus::Frozen | CampaignStatus::Active
            ),
            BuilderLoopError::InvalidCampaignStatus
        );
        require!(
            args.amount_per_claim > 0 && args.max_claims > 0,
            BuilderLoopError::InvalidRewardCapacity
        );
        require!(
            args.starts_at < args.ends_at,
            BuilderLoopError::InvalidRewardWindow
        );
        let reward = &mut ctx.accounts.reward;
        reward.campaign = campaign.key();
        reward.reward_authority = ctx.accounts.reward_authority.key();
        reward.reward_id = args.reward_id;
        reward.config_hash = campaign.config_hash;
        reward.mint = ctx.accounts.mint.key();
        reward.vault = ctx.accounts.vault.key();
        reward.amount_per_claim = args.amount_per_claim;
        reward.max_claims = args.max_claims;
        reward.claimed_count = 0;
        reward.starts_at = args.starts_at;
        reward.ends_at = args.ends_at;
        reward.status = RewardStatus::Draft;
        reward.bump = ctx.bumps.reward;
        reward.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn fund_reward(ctx: Context<FundReward>, amount: u64) -> Result<()> {
        require!(
            matches!(
                ctx.accounts.reward.status,
                RewardStatus::Draft | RewardStatus::Funded
            ),
            BuilderLoopError::InvalidRewardStatus
        );
        require!(amount > 0, BuilderLoopError::InvalidRewardCapacity);
        token_interface::transfer_checked(
            ctx.accounts.transfer_ctx(),
            amount,
            ctx.accounts.mint.decimals,
        )?;
        ctx.accounts.reward.status = RewardStatus::Funded;
        Ok(())
    }

    pub fn activate_reward(ctx: Context<RewardAuthority>) -> Result<()> {
        let reward = &mut ctx.accounts.reward;
        require!(
            reward.status == RewardStatus::Funded,
            BuilderLoopError::InvalidRewardStatus
        );
        let required = reward
            .amount_per_claim
            .checked_mul(u64::from(reward.max_claims))
            .ok_or(BuilderLoopError::ArithmeticOverflow)?;
        require!(
            ctx.accounts.vault.amount >= required,
            BuilderLoopError::RewardUnderfunded
        );
        let now = Clock::get()?.unix_timestamp;
        require!(now < reward.ends_at, BuilderLoopError::InvalidRewardWindow);
        reward.status = RewardStatus::Active;
        Ok(())
    }

    pub fn pause_reward(ctx: Context<RewardAuthority>) -> Result<()> {
        require!(
            ctx.accounts.reward.status == RewardStatus::Active,
            BuilderLoopError::InvalidRewardStatus
        );
        ctx.accounts.reward.status = RewardStatus::Paused;
        Ok(())
    }

    pub fn resume_reward(ctx: Context<RewardAuthority>) -> Result<()> {
        require!(
            ctx.accounts.reward.status == RewardStatus::Paused,
            BuilderLoopError::InvalidRewardStatus
        );
        require!(
            Clock::get()?.unix_timestamp <= ctx.accounts.reward.ends_at,
            BuilderLoopError::InvalidRewardWindow
        );
        ctx.accounts.reward.status = RewardStatus::Active;
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let reward = &ctx.accounts.reward;
        require!(
            reward.status == RewardStatus::Active,
            BuilderLoopError::InvalidRewardStatus
        );
        require!(
            now >= reward.starts_at && now <= reward.ends_at,
            BuilderLoopError::InvalidRewardWindow
        );
        require!(
            reward.config_hash == ctx.accounts.campaign.config_hash,
            BuilderLoopError::ConfigHashMismatch
        );
        require!(
            ctx.accounts.user_progress.stage == UserStage::Shipped,
            BuilderLoopError::InvalidUserStage
        );
        require!(
            reward.claimed_count < reward.max_claims,
            BuilderLoopError::RewardExhausted
        );
        let amount = reward.amount_per_claim;
        let campaign_key = ctx.accounts.campaign.key();
        let authority_key = reward.reward_authority;
        let reward_id = reward.reward_id.to_le_bytes();
        let bump = [reward.bump];
        let signer: &[&[u8]] = &[
            REWARD_SEED,
            campaign_key.as_ref(),
            authority_key.as_ref(),
            &reward_id,
            &bump,
        ];
        token_interface::transfer_checked(
            ctx.accounts.claim_transfer_ctx().with_signer(&[signer]),
            amount,
            ctx.accounts.mint.decimals,
        )?;
        let reward = &mut ctx.accounts.reward;
        reward.claimed_count = reward
            .claimed_count
            .checked_add(1)
            .ok_or(BuilderLoopError::ArithmeticOverflow)?;
        let claim = &mut ctx.accounts.claim;
        claim.reward = reward.key();
        claim.user = ctx.accounts.wallet.key();
        claim.amount = amount;
        claim.claimed_at = now;
        claim.bump = ctx.bumps.claim;
        Ok(())
    }

    pub fn withdraw_remaining_inventory(ctx: Context<WithdrawReward>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(
            matches!(
                ctx.accounts.reward.status,
                RewardStatus::Funded | RewardStatus::Active | RewardStatus::Paused
            ),
            BuilderLoopError::InvalidRewardStatus
        );
        require!(
            now > ctx.accounts.reward.ends_at,
            BuilderLoopError::WithdrawalTooEarly
        );
        let amount = ctx.accounts.vault.amount;
        let campaign_key = ctx.accounts.reward.campaign;
        let authority_key = ctx.accounts.reward.reward_authority;
        let reward_id = ctx.accounts.reward.reward_id.to_le_bytes();
        let bump = [ctx.accounts.reward.bump];
        let signer: &[&[u8]] = &[
            REWARD_SEED,
            campaign_key.as_ref(),
            authority_key.as_ref(),
            &reward_id,
            &bump,
        ];
        if amount > 0 {
            token_interface::transfer_checked(
                ctx.accounts.withdraw_ctx().with_signer(&[signer]),
                amount,
                ctx.accounts.mint.decimals,
            )?;
        }
        ctx.accounts.reward.status = RewardStatus::Ended;
        Ok(())
    }

    pub fn close_reward(ctx: Context<CloseReward>) -> Result<()> {
        require!(
            ctx.accounts.reward.status == RewardStatus::Ended,
            BuilderLoopError::InvalidRewardStatus
        );
        require!(
            ctx.accounts.vault.amount == 0,
            BuilderLoopError::VaultNotEmpty
        );
        ctx.accounts.reward.status = RewardStatus::Closed;
        let campaign_key = ctx.accounts.reward.campaign;
        let authority_key = ctx.accounts.reward.reward_authority;
        let reward_id = ctx.accounts.reward.reward_id.to_le_bytes();
        let bump = [ctx.accounts.reward.bump];
        let signer: &[&[u8]] = &[
            REWARD_SEED,
            campaign_key.as_ref(),
            authority_key.as_ref(),
            &reward_id,
            &bump,
        ];
        token_interface::close_account(ctx.accounts.close_vault_ctx().with_signer(&[signer]))?;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateCampaignArgs {
    pub campaign_id: u64,
    pub verifier: Pubkey,
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
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ModuleVoucher {
    pub verifier_epoch: u32,
    pub event_id_hash: [u8; 32],
    pub project_id: [u8; 32],
    pub project_seed_hash: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub expires_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateRewardArgs {
    pub reward_id: u64,
    pub amount_per_claim: u64,
    pub max_claims: u32,
    pub starts_at: i64,
    pub ends_at: i64,
}

#[derive(Accounts)]
#[instruction(args: CreateCampaignArgs)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + CampaignConfig::INIT_SPACE, seeds = [CAMPAIGN_SEED, authority.key().as_ref(), &args.campaign_id.to_le_bytes()], bump)]
    pub campaign: Account<'info, CampaignConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CampaignAuthority<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority, seeds = [CAMPAIGN_SEED, authority.key().as_ref(), &campaign.campaign_id.to_le_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, CampaignConfig>,
}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    pub campaign: Account<'info, CampaignConfig>,
    #[account(init, payer = wallet, space = 8 + UserProgress::INIT_SPACE, seeds = [USER_SEED, campaign.key().as_ref(), wallet.key().as_ref()], bump)]
    pub user_progress: Account<'info, UserProgress>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: ModuleVoucher)]
pub struct SubmitModule<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    pub campaign: Account<'info, CampaignConfig>,
    #[account(mut, seeds = [USER_SEED, campaign.key().as_ref(), wallet.key().as_ref()], bump = user_progress.bump, has_one = campaign, constraint = user_progress.wallet == wallet.key() @ BuilderLoopError::WalletMismatch)]
    pub user_progress: Account<'info, UserProgress>,
    #[account(init, payer = wallet, space = 8 + ModuleReceipt::INIT_SPACE, seeds = [MODULE_SEED, campaign.key().as_ref(), &args.event_id_hash], bump)]
    pub module_receipt: Account<'info, ModuleReceipt>,
    /// CHECK: address pins the instructions sysvar; contents are parsed strictly.
    #[account(address = instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PendingModule<'info> {
    pub wallet: Signer<'info>,
    pub campaign: Account<'info, CampaignConfig>,
    #[account(mut, seeds = [USER_SEED, campaign.key().as_ref(), wallet.key().as_ref()], bump = user_progress.bump, constraint = user_progress.wallet == wallet.key() @ BuilderLoopError::WalletMismatch)]
    pub user_progress: Account<'info, UserProgress>,
    #[account(mut, seeds = [MODULE_SEED, campaign.key().as_ref(), &module_receipt.event_id_hash], bump = module_receipt.bump, has_one = campaign, constraint = module_receipt.user == wallet.key() @ BuilderLoopError::WalletMismatch)]
    pub module_receipt: Account<'info, ModuleReceipt>,
}

#[derive(Accounts)]
pub struct RecordNativeShip<'info> {
    pub wallet: Signer<'info>,
    pub campaign: Account<'info, CampaignConfig>,
    #[account(mut, seeds = [USER_SEED, campaign.key().as_ref(), wallet.key().as_ref()], bump = user_progress.bump, constraint = user_progress.wallet == wallet.key() @ BuilderLoopError::WalletMismatch)]
    pub user_progress: Account<'info, UserProgress>,
    /// CHECK: exact owner, discriminator, layout, PDA, and frozen fields are checked in the handler.
    pub completion: UncheckedAccount<'info>,
    pub source_authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(args: CreateRewardArgs)]
pub struct CreateReward<'info> {
    #[account(mut, address = campaign.reward_authority @ BuilderLoopError::WrongRewardAuthority)]
    pub reward_authority: Signer<'info>,
    pub campaign: Account<'info, CampaignConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(init, payer = reward_authority, space = 8 + Reward::INIT_SPACE, seeds = [REWARD_SEED, campaign.key().as_ref(), reward_authority.key().as_ref(), &args.reward_id.to_le_bytes()], bump)]
    pub reward: Account<'info, Reward>,
    #[account(init, payer = reward_authority, token::mint = mint, token::authority = reward, token::token_program = token_program, seeds = [VAULT_SEED, reward.key().as_ref()], bump)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundReward<'info> {
    #[account(mut, address = reward.reward_authority @ BuilderLoopError::WrongRewardAuthority)]
    pub reward_authority: Signer<'info>,
    #[account(mut, has_one = mint, has_one = vault)]
    pub reward: Account<'info, Reward>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = reward_authority)]
    pub source: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, seeds = [VAULT_SEED, reward.key().as_ref()], bump = reward.vault_bump)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}
impl<'info> FundReward<'info> {
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            TransferChecked {
                from: self.source.to_account_info(),
                mint: self.mint.to_account_info(),
                to: self.vault.to_account_info(),
                authority: self.reward_authority.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct RewardAuthority<'info> {
    #[account(address = reward.reward_authority @ BuilderLoopError::WrongRewardAuthority)]
    pub reward_authority: Signer<'info>,
    #[account(mut, has_one = vault)]
    pub reward: Account<'info, Reward>,
    #[account(seeds = [VAULT_SEED, reward.key().as_ref()], bump = reward.vault_bump)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    pub campaign: Account<'info, CampaignConfig>,
    #[account(seeds = [USER_SEED, campaign.key().as_ref(), wallet.key().as_ref()], bump = user_progress.bump, constraint = user_progress.wallet == wallet.key() @ BuilderLoopError::WalletMismatch)]
    pub user_progress: Account<'info, UserProgress>,
    #[account(mut, has_one = campaign, has_one = mint, has_one = vault)]
    pub reward: Account<'info, Reward>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [VAULT_SEED, reward.key().as_ref()], bump = reward.vault_bump)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = wallet)]
    pub recipient: InterfaceAccount<'info, TokenAccount>,
    #[account(init, payer = wallet, space = 8 + Claim::INIT_SPACE, seeds = [CLAIM_SEED, reward.key().as_ref(), wallet.key().as_ref()], bump)]
    pub claim: Account<'info, Claim>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
impl<'info> ClaimReward<'info> {
    fn claim_transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            TransferChecked {
                from: self.vault.to_account_info(),
                mint: self.mint.to_account_info(),
                to: self.recipient.to_account_info(),
                authority: self.reward.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct WithdrawReward<'info> {
    #[account(address = reward.reward_authority @ BuilderLoopError::WrongRewardAuthority)]
    pub reward_authority: Signer<'info>,
    #[account(mut, has_one = mint, has_one = vault)]
    pub reward: Account<'info, Reward>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [VAULT_SEED, reward.key().as_ref()], bump = reward.vault_bump)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = reward_authority)]
    pub destination: InterfaceAccount<'info, TokenAccount>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}
impl<'info> WithdrawReward<'info> {
    fn withdraw_ctx(&self) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            TransferChecked {
                from: self.vault.to_account_info(),
                mint: self.mint.to_account_info(),
                to: self.destination.to_account_info(),
                authority: self.reward.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct CloseReward<'info> {
    #[account(mut, address = reward.reward_authority @ BuilderLoopError::WrongRewardAuthority)]
    pub reward_authority: Signer<'info>,
    #[account(mut, close = reward_authority)]
    pub reward: Account<'info, Reward>,
    #[account(mut, seeds = [VAULT_SEED, reward.key().as_ref()], bump = reward.vault_bump)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}
impl<'info> CloseReward<'info> {
    fn close_vault_ctx(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.vault.to_account_info(),
                destination: self.reward_authority.to_account_info(),
                authority: self.reward.to_account_info(),
            },
        )
    }
}

#[account]
#[derive(InitSpace)]
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
#[account]
#[derive(InitSpace)]
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
#[account]
#[derive(InitSpace)]
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
#[account]
#[derive(InitSpace)]
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
    pub vault_bump: u8,
}
#[account]
#[derive(InitSpace)]
pub struct Claim {
    pub reward: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub claimed_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CampaignStatus {
    Draft,
    Frozen,
    Active,
    Finalized,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum UserStage {
    Initialized,
    ModulePending,
    ModuleFinalized,
    Shipped,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ReceiptStatus {
    Pending,
    Finalized,
    Cancelled,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RewardStatus {
    Draft,
    Funded,
    Active,
    Paused,
    Ended,
    Closed,
}

#[derive(AnchorDeserialize)]
struct CompletionView {
    user: Pubkey,
    challenge_id: u64,
    project_id: [u8; 32],
    artifact_hash: [u8; 32],
    completed_at: i64,
    completed: bool,
    bump: u8,
}

fn read_completion(account: &UncheckedAccount<'_>) -> Result<CompletionView> {
    let data = account.try_borrow_data()?;
    require!(
        data.len() == 8 + 32 + 8 + 32 + 32 + 8 + 1 + 1,
        BuilderLoopError::MalformedCompletion
    );
    require!(
        data[..8] == COMPLETION_DISCRIMINATOR,
        BuilderLoopError::WrongCompletionDiscriminator
    );
    CompletionView::deserialize(&mut &data[8..])
        .map_err(|_| error!(BuilderLoopError::MalformedCompletion))
}

fn validate_campaign_args(a: &CreateCampaignArgs) -> Result<()> {
    for key in [
        a.verifier,
        a.reward_authority,
        a.source_program,
        a.source_authority,
    ] {
        require!(key != Pubkey::default(), BuilderLoopError::DefaultKey);
    }
    require!(
        a.start_ts < a.end_ts && a.period_seconds > 0 && a.total_periods > 0,
        BuilderLoopError::InvalidSchedule
    );
    require!(
        a.min_period_gap < a.total_periods
            && a.min_elapsed_seconds >= 0
            && a.module_challenge_delay >= 0,
        BuilderLoopError::InvalidTiming
    );
    let duration = a
        .end_ts
        .checked_sub(a.start_ts)
        .ok_or(BuilderLoopError::ArithmeticOverflow)?;
    require!(
        duration.checked_div(a.period_seconds) == Some(i64::from(a.total_periods))
            && duration % a.period_seconds == 0,
        BuilderLoopError::InvalidSchedule
    );
    Ok(())
}
fn assert_campaign_actionable(c: &CampaignConfig) -> Result<()> {
    require!(
        c.status == CampaignStatus::Active,
        BuilderLoopError::InvalidCampaignStatus
    );
    require!(!c.actions_paused, BuilderLoopError::ActionsPaused);
    let now = Clock::get()?.unix_timestamp;
    require!(
        now >= c.start_ts && now < c.end_ts,
        BuilderLoopError::OutsideCampaignWindow
    );
    Ok(())
}
fn period_for(c: &CampaignConfig, now: i64) -> Result<u8> {
    require!(
        now >= c.start_ts && now < c.end_ts,
        BuilderLoopError::OutsideCampaignWindow
    );
    let p = now
        .checked_sub(c.start_ts)
        .and_then(|v| v.checked_div(c.period_seconds))
        .ok_or(BuilderLoopError::ArithmeticOverflow)?;
    require!(
        p >= 0 && p < i64::from(c.total_periods),
        BuilderLoopError::OutsideCampaignWindow
    );
    u8::try_from(p).map_err(|_| error!(BuilderLoopError::ArithmeticOverflow))
}
fn project_id(campaign: Pubkey, user: Pubkey, seed: [u8; 32]) -> [u8; 32] {
    hash(
        &[
            PROJECT_DOMAIN,
            crate::ID.as_ref(),
            campaign.as_ref(),
            user.as_ref(),
            &seed,
        ]
        .concat(),
    )
    .to_bytes()
}
fn module_message(campaign: Pubkey, user: Pubkey, v: &ModuleVoucher) -> Vec<u8> {
    let mut b = Vec::with_capacity(225);
    b.extend_from_slice(MODULE_DOMAIN);
    b.extend_from_slice(crate::ID.as_ref());
    b.extend_from_slice(campaign.as_ref());
    b.extend_from_slice(user.as_ref());
    b.extend_from_slice(&v.verifier_epoch.to_le_bytes());
    b.extend_from_slice(&v.event_id_hash);
    b.extend_from_slice(&v.project_id);
    b.extend_from_slice(&v.project_seed_hash);
    b.extend_from_slice(&v.metadata_hash);
    b.extend_from_slice(&v.expires_at.to_le_bytes());
    b
}
fn campaign_hash(c: &CampaignConfig) -> Result<[u8; 32]> {
    let mut b = Vec::with_capacity(249);
    b.extend_from_slice(CONFIG_DOMAIN);
    b.extend_from_slice(c.authority.as_ref());
    b.extend_from_slice(&c.campaign_id.to_le_bytes());
    b.extend_from_slice(c.verifier.as_ref());
    b.extend_from_slice(&c.verifier_epoch.to_le_bytes());
    b.push(u8::from(c.verifier_active));
    b.extend_from_slice(c.reward_authority.as_ref());
    b.extend_from_slice(&c.start_ts.to_le_bytes());
    b.extend_from_slice(&c.end_ts.to_le_bytes());
    b.extend_from_slice(&c.period_seconds.to_le_bytes());
    b.push(c.total_periods);
    b.push(c.min_period_gap);
    b.extend_from_slice(&c.min_elapsed_seconds.to_le_bytes());
    b.extend_from_slice(&c.module_challenge_delay.to_le_bytes());
    b.extend_from_slice(&c.module_namespace.to_le_bytes());
    b.extend_from_slice(&c.canonicalizer_version.to_le_bytes());
    b.extend_from_slice(c.source_program.as_ref());
    b.extend_from_slice(c.source_authority.as_ref());
    b.extend_from_slice(&c.challenge_id.to_le_bytes());
    b.push(u8::from(c.actions_paused));
    Ok(hash(&b).to_bytes())
}

fn inspect_ed25519(sysvar: &AccountInfo<'_>, verifier: Pubkey, expected: &[u8]) -> Result<()> {
    let current = instructions::load_current_index_checked(sysvar)
        .map_err(|_| error!(BuilderLoopError::MalformedEd25519Instruction))?;
    require!(current > 0, BuilderLoopError::MissingEd25519Instruction);
    let ix = instructions::load_instruction_at_checked(usize::from(current - 1), sysvar)
        .map_err(|_| error!(BuilderLoopError::MalformedEd25519Instruction))?;
    require_keys_eq!(
        ix.program_id,
        ed25519_program::ID,
        BuilderLoopError::MissingEd25519Instruction
    );
    let d = ix.data;
    require!(
        d.len() == 112 + expected.len() && d[0] == 1 && d[1] == 0,
        BuilderLoopError::MalformedEd25519Instruction
    );
    let u16_at = |n: usize| u16::from_le_bytes([d[n], d[n + 1]]);
    require!(
        u16_at(2) == 48
            && u16_at(4) == u16::MAX
            && u16_at(6) == 16
            && u16_at(8) == u16::MAX
            && u16_at(10) == 112
            && usize::from(u16_at(12)) == expected.len()
            && u16_at(14) == u16::MAX,
        BuilderLoopError::MalformedEd25519Instruction
    );
    require!(
        d[16..48] == verifier.to_bytes() && d[112..] == *expected,
        BuilderLoopError::Ed25519MessageMismatch
    );
    Ok(())
}

#[event]
pub struct CampaignFrozen {
    pub campaign: Pubkey,
    pub config_hash: [u8; 32],
}
#[event]
pub struct ShipRecorded {
    pub campaign: Pubkey,
    pub wallet: Pubkey,
    pub project_id: [u8; 32],
    pub artifact_hash: [u8; 32],
}

#[error_code]
pub enum BuilderLoopError {
    #[msg("critical key is default")]
    DefaultKey,
    #[msg("invalid schedule")]
    InvalidSchedule,
    #[msg("invalid timing")]
    InvalidTiming,
    #[msg("arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("invalid campaign status")]
    InvalidCampaignStatus,
    #[msg("actions paused")]
    ActionsPaused,
    #[msg("verifier inactive")]
    VerifierInactive,
    #[msg("verifier epoch mismatch")]
    VerifierEpochMismatch,
    #[msg("voucher expired")]
    VoucherExpired,
    #[msg("zero hash")]
    ZeroHash,
    #[msg("project mismatch")]
    ProjectMismatch,
    #[msg("invalid user stage")]
    InvalidUserStage,
    #[msg("invalid receipt status")]
    InvalidReceiptStatus,
    #[msg("stale receipt epoch")]
    StaleReceiptEpoch,
    #[msg("challenge delay active")]
    ChallengeDelayActive,
    #[msg("outside campaign window")]
    OutsideCampaignWindow,
    #[msg("wrong source program")]
    WrongSourceProgram,
    #[msg("wrong source authority")]
    WrongSourceAuthority,
    #[msg("source authority did not sign CPI")]
    SourceAuthorityNotSigner,
    #[msg("wrong completion PDA")]
    WrongCompletionPda,
    #[msg("wrong completion discriminator")]
    WrongCompletionDiscriminator,
    #[msg("malformed completion")]
    MalformedCompletion,
    #[msg("wallet mismatch")]
    WalletMismatch,
    #[msg("challenge mismatch")]
    ChallengeMismatch,
    #[msg("completion incomplete")]
    CompletionIncomplete,
    #[msg("elapsed gate active")]
    ElapsedGateActive,
    #[msg("period gate active")]
    PeriodGateActive,
    #[msg("missing Ed25519 instruction")]
    MissingEd25519Instruction,
    #[msg("malformed Ed25519 instruction")]
    MalformedEd25519Instruction,
    #[msg("Ed25519 message mismatch")]
    Ed25519MessageMismatch,
    #[msg("wrong reward authority")]
    WrongRewardAuthority,
    #[msg("invalid reward capacity")]
    InvalidRewardCapacity,
    #[msg("invalid reward window")]
    InvalidRewardWindow,
    #[msg("invalid reward status")]
    InvalidRewardStatus,
    #[msg("reward underfunded")]
    RewardUnderfunded,
    #[msg("config hash mismatch")]
    ConfigHashMismatch,
    #[msg("reward exhausted")]
    RewardExhausted,
    #[msg("withdrawal too early")]
    WithdrawalTooEarly,
    #[msg("vault not empty")]
    VaultNotEmpty,
}
