# BuilderLoop Architecture

`programs/builderloop` owns CampaignConfig, UserProgress, ModuleReceipt, Reward, and Claim PDAs. Campaign creation validates every critical key and checked schedule; freeze hashes the fixed binary layout before activation. User progression has no override path.

Module submission requires a user signer and an immediately preceding Ed25519 precompile instruction. The handler validates the one-signature header, every offset and instruction index, verifier key, and exact fixed-width message. A campaign/event PDA retains replay protection even after cancellation. Only a current-epoch pending receipt can finalize after Solana Clock's challenge delay.

`programs/cohort-build` owns Challenge, BuildSubmission, and Completion. Completion requires the user signer, matching submission, and nonzero artifact. It serializes Completion inside the instruction, then signs a CPI with `[b"builderloop_authority", builderloop_program_id]`. BuilderLoop validates the frozen source program/authority, Completion owner/discriminator/exact length/PDA/bump/user/project/challenge/artifact, and Clock time/period gates before storing Shipped.

Reward is a PDA controlling a classic SPL Token vault PDA. It snapshots the frozen config hash and fixes amount/capacity/window. Activation proves inventory; Claim is one PDA per reward/wallet and transfers the stored amount to a signer-owned same-mint account. Remainder withdrawal is deadline-gated; terminal close returns Reward and vault rent to the reward authority.

`crates/protocol-core` and `src/protocol.js` remain deterministic reference vectors, not substitutes for the Anchor programs. `tests/anchor/localnet.test.js` is the cross-program execution evidence.
