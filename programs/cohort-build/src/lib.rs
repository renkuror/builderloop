#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use builderloop::cpi::accounts::RecordNativeShip;

declare_id!("BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF");

pub const CHALLENGE_SEED: &[u8] = b"challenge";
pub const SUBMISSION_SEED: &[u8] = b"submission";
pub const COMPLETION_SEED: &[u8] = b"completion";
pub const AUTHORITY_SEED: &[u8] = b"builderloop_authority";

#[program]
pub mod cohort_build {
    use super::*;

    pub fn create_challenge(ctx: Context<CreateChallenge>, challenge_id: u64) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        challenge.authority = ctx.accounts.authority.key();
        challenge.challenge_id = challenge_id;
        challenge.active = true;
        challenge.bump = ctx.bumps.challenge;
        Ok(())
    }

    pub fn create_build_submission(
        ctx: Context<CreateBuildSubmission>,
        project_id: [u8; 32],
    ) -> Result<()> {
        require!(project_id != [0; 32], CohortBuildError::ZeroProject);
        require!(
            ctx.accounts.challenge.active,
            CohortBuildError::ChallengeInactive
        );
        let submission = &mut ctx.accounts.submission;
        submission.challenge = ctx.accounts.challenge.key();
        submission.user = ctx.accounts.user.key();
        submission.project_id = project_id;
        submission.created_at = Clock::get()?.unix_timestamp;
        submission.completed = false;
        submission.bump = ctx.bumps.submission;
        Ok(())
    }

    pub fn complete_build(ctx: Context<CompleteBuild>, artifact_hash: [u8; 32]) -> Result<()> {
        require!(artifact_hash != [0; 32], CohortBuildError::ZeroArtifact);
        require!(
            ctx.accounts.challenge.active,
            CohortBuildError::ChallengeInactive
        );
        require!(
            !ctx.accounts.submission.completed,
            CohortBuildError::AlreadyCompleted
        );
        let now = Clock::get()?.unix_timestamp;
        let completion = &mut ctx.accounts.completion;
        completion.user = ctx.accounts.user.key();
        completion.challenge_id = ctx.accounts.challenge.challenge_id;
        completion.project_id = ctx.accounts.submission.project_id;
        completion.artifact_hash = artifact_hash;
        completion.completed_at = now;
        completion.completed = true;
        completion.bump = ctx.bumps.completion;
        ctx.accounts.submission.completed = true;

        // Anchor normally serializes at handler exit; the native CPI must see
        // the finalized account bytes atomically within this instruction.
        ctx.accounts.completion.exit(&crate::ID)?;

        let builderloop_id = builderloop::ID;
        let bump = [ctx.bumps.source_authority];
        let signer: &[&[u8]] = &[AUTHORITY_SEED, builderloop_id.as_ref(), &bump];
        let accounts = RecordNativeShip {
            wallet: ctx.accounts.user.to_account_info(),
            campaign: ctx.accounts.campaign.to_account_info(),
            user_progress: ctx.accounts.user_progress.to_account_info(),
            completion: ctx.accounts.completion.to_account_info(),
            source_authority: ctx.accounts.source_authority.to_account_info(),
        };
        builderloop::cpi::record_native_ship(
            CpiContext::new(ctx.accounts.builderloop_program.to_account_info(), accounts)
                .with_signer(&[signer]),
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(challenge_id: u64)]
pub struct CreateChallenge<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + Challenge::INIT_SPACE, seeds = [CHALLENGE_SEED, &challenge_id.to_le_bytes()], bump)]
    pub challenge: Account<'info, Challenge>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBuildSubmission<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub challenge: Account<'info, Challenge>,
    #[account(init, payer = user, space = 8 + BuildSubmission::INIT_SPACE, seeds = [SUBMISSION_SEED, challenge.key().as_ref(), user.key().as_ref()], bump)]
    pub submission: Account<'info, BuildSubmission>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteBuild<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub challenge: Account<'info, Challenge>,
    #[account(mut, seeds = [SUBMISSION_SEED, challenge.key().as_ref(), user.key().as_ref()], bump = submission.bump, constraint = submission.user == user.key() @ CohortBuildError::WrongUser, constraint = submission.challenge == challenge.key() @ CohortBuildError::WrongChallenge)]
    pub submission: Account<'info, BuildSubmission>,
    #[account(init, payer = user, space = 8 + Completion::INIT_SPACE, seeds = [COMPLETION_SEED, &challenge.challenge_id.to_le_bytes(), user.key().as_ref()], bump)]
    pub completion: Account<'info, Completion>,
    /// CHECK: BuilderLoop validates this exact campaign account.
    pub campaign: UncheckedAccount<'info>,
    /// CHECK: BuilderLoop validates its campaign-wallet PDA and contents.
    #[account(mut)]
    pub user_progress: UncheckedAccount<'info>,
    /// CHECK: constrained to the native source-authority PDA and signs only the CPI below.
    #[account(seeds = [AUTHORITY_SEED, builderloop::ID.as_ref()], bump)]
    pub source_authority: UncheckedAccount<'info>,
    pub builderloop_program: Program<'info, builderloop::program::Builderloop>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Challenge {
    pub authority: Pubkey,
    pub challenge_id: u64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BuildSubmission {
    pub challenge: Pubkey,
    pub user: Pubkey,
    pub project_id: [u8; 32],
    pub created_at: i64,
    pub completed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Completion {
    pub user: Pubkey,
    pub challenge_id: u64,
    pub project_id: [u8; 32],
    pub artifact_hash: [u8; 32],
    pub completed_at: i64,
    pub completed: bool,
    pub bump: u8,
}

#[error_code]
pub enum CohortBuildError {
    #[msg("project id is zero")]
    ZeroProject,
    #[msg("artifact hash is zero")]
    ZeroArtifact,
    #[msg("challenge is inactive")]
    ChallengeInactive,
    #[msg("completion already exists")]
    AlreadyCompleted,
    #[msg("wrong user")]
    WrongUser,
    #[msg("wrong challenge")]
    WrongChallenge,
}
