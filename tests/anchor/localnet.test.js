import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import * as anchor from "@coral-xyz/anchor";
import { Ed25519Program, Keypair, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, SystemProgram, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAccount, createMint, getAccount, mintTo } from "@solana/spl-token";

const BUILDERLOOP = new PublicKey("3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2");
const COHORT = new PublicKey("BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF");
const sha = (...parts) => createHash("sha256").update(Buffer.concat(parts)).digest();
const le64 = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const ule64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const le32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const expectFailure = async (promise, label) => {
  await assert.rejects(promise, (error) => {
    assert.ok(error, `${label} should return an error`);
    return true;
  });
};

test("local validator enforces Module, native CPI, and fixed SPL reward lifecycle", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const builderIdl = JSON.parse(readFileSync("target/idl/builderloop.json", "utf8"));
  const cohortIdl = JSON.parse(readFileSync("target/idl/cohort_build.json", "utf8"));
  const builder = new anchor.Program(builderIdl, provider);
  const cohort = new anchor.Program(cohortIdl, provider);
  assert.equal(builder.programId.toBase58(), BUILDERLOOP.toBase58());
  assert.equal(cohort.programId.toBase58(), COHORT.toBase58());

  const authority = provider.wallet.publicKey;
  const rewardAuthority = Keypair.generate();
  const user = Keypair.generate();
  const attacker = Keypair.generate();
  const verifier = Keypair.generate();
  for (const key of [rewardAuthority.publicKey, user.publicKey, attacker.publicKey]) {
    const signature = await provider.connection.requestAirdrop(key, 4 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(signature, "confirmed");
  }

  const campaignId = 7;
  const challengeId = 19;
  const [sourceAuthority] = PublicKey.findProgramAddressSync([Buffer.from("builderloop_authority"), BUILDERLOOP.toBuffer()], COHORT);
  const [campaign] = PublicKey.findProgramAddressSync([Buffer.from("campaign"), authority.toBuffer(), ule64(campaignId)], BUILDERLOOP);
  const [progress] = PublicKey.findProgramAddressSync([Buffer.from("user"), campaign.toBuffer(), user.publicKey.toBuffer()], BUILDERLOOP);
  const now = Math.floor(Date.now() / 1000);
  const start = now - 8;
  const args = {
    campaignId: new anchor.BN(campaignId), verifier: verifier.publicKey, rewardAuthority: rewardAuthority.publicKey,
    startTs: new anchor.BN(start), endTs: new anchor.BN(start + 120), periodSeconds: new anchor.BN(2), totalPeriods: 60,
    minPeriodGap: 1, minElapsedSeconds: new anchor.BN(1), moduleChallengeDelay: new anchor.BN(1), moduleNamespace: 1,
    canonicalizerVersion: 1, sourceProgram: COHORT, sourceAuthority, challengeId: new anchor.BN(challengeId),
  };
  await builder.methods.createCampaign(args).accounts({ authority, campaign, systemProgram: SystemProgram.programId }).rpc();
  await expectFailure(
    builder.methods.freezeCampaign().accounts({ authority: attacker.publicKey, campaign }).signers([attacker]).rpc(),
    "wrong campaign authority",
  );
  await builder.methods.freezeCampaign().accounts({ authority, campaign }).rpc();
  const frozen = await builder.account.campaignConfig.fetch(campaign);
  assert.notDeepEqual(Buffer.from(frozen.configHash), Buffer.alloc(32));
  await builder.methods.startCampaign().accounts({ authority, campaign }).rpc();
  await builder.methods.initUser().accounts({ wallet: user.publicKey, campaign, userProgress: progress, systemProgram: SystemProgram.programId }).signers([user]).rpc();
  const [attackerProgress] = PublicKey.findProgramAddressSync([Buffer.from("user"), campaign.toBuffer(), attacker.publicKey.toBuffer()], BUILDERLOOP);
  await builder.methods.initUser().accounts({ wallet: attacker.publicKey, campaign, userProgress: attackerProgress, systemProgram: SystemProgram.programId }).signers([attacker]).rpc();

  const seedHash = sha(Buffer.from("local-project-seed"));
  const projectId = sha(Buffer.from("BUILDERLOOP_PROJECT_V1"), BUILDERLOOP.toBuffer(), campaign.toBuffer(), user.publicKey.toBuffer(), seedHash);
  const eventHash = sha(Buffer.from("namespace:1:event:local-001"));
  const metadataHash = sha(Buffer.from("module metadata"));
  const expires = start + 100;
  const voucher = { verifierEpoch: 0, eventIdHash: [...eventHash], projectId: [...projectId], projectSeedHash: [...seedHash], metadataHash: [...metadataHash], expiresAt: new anchor.BN(expires) };
  const message = Buffer.concat([
    Buffer.from("BUILDERLOOP_MODULE_V1"), BUILDERLOOP.toBuffer(), campaign.toBuffer(), user.publicKey.toBuffer(), le32(0),
    eventHash, projectId, seedHash, metadataHash, le64(expires),
  ]);
  const [receipt] = PublicKey.findProgramAddressSync([Buffer.from("module"), campaign.toBuffer(), eventHash], BUILDERLOOP);
  const ed25519 = Ed25519Program.createInstructionWithPrivateKey({ privateKey: verifier.secretKey, message });
  const submit = await builder.methods.submitModuleAttestation(voucher).accounts({
    wallet: user.publicKey, campaign, userProgress: progress, moduleReceipt: receipt,
    instructions: SYSVAR_INSTRUCTIONS_PUBKEY, systemProgram: SystemProgram.programId,
  }).instruction();
  await builder.methods.pauseActions().accounts({ authority, campaign }).rpc();
  await expectFailure(provider.sendAndConfirm(new Transaction().add(ed25519, submit), [user]), "Module while campaign paused");
  await builder.methods.resumeActions().accounts({ authority, campaign }).rpc();
  const malformed = Ed25519Program.createInstructionWithPrivateKey({ privateKey: verifier.secretKey, message: Buffer.from(message) });
  malformed.data.writeUInt16LE(111, 10);
  await expectFailure(provider.sendAndConfirm(new Transaction().add(malformed, submit), [user]), "malformed Ed25519 offsets");
  const substituted = Buffer.from(message);
  substituted[substituted.length - 9] ^= 1;
  const wrongMessage = Ed25519Program.createInstructionWithPrivateKey({ privateKey: verifier.secretKey, message: substituted });
  await expectFailure(provider.sendAndConfirm(new Transaction().add(wrongMessage, submit), [user]), "substituted Ed25519 message");
  const wrongVerifier = Ed25519Program.createInstructionWithPrivateKey({ privateKey: attacker.secretKey, message });
  await expectFailure(provider.sendAndConfirm(new Transaction().add(wrongVerifier, submit), [user]), "wrong verifier key");
  await provider.sendAndConfirm(new Transaction().add(ed25519, submit), [user]);
  assert.deepEqual((await builder.account.userProgress.fetch(progress)).stage, { modulePending: {} });
  await expectFailure(builder.methods.finalizeModule().accounts({ wallet: user.publicKey, campaign, userProgress: progress, moduleReceipt: receipt }).signers([user]).rpc(), "early finalize");
  await sleep(1500);
  await builder.methods.finalizeModule().accounts({ wallet: user.publicKey, campaign, userProgress: progress, moduleReceipt: receipt }).signers([user]).rpc();
  assert.deepEqual((await builder.account.userProgress.fetch(progress)).stage, { moduleFinalized: {} });

  const [challenge] = PublicKey.findProgramAddressSync([Buffer.from("challenge"), ule64(challengeId)], COHORT);
  await cohort.methods.createChallenge(new anchor.BN(challengeId)).accounts({ authority, challenge, systemProgram: SystemProgram.programId }).rpc();
  const [submission] = PublicKey.findProgramAddressSync([Buffer.from("submission"), challenge.toBuffer(), user.publicKey.toBuffer()], COHORT);
  await cohort.methods.createBuildSubmission([...projectId]).accounts({ user: user.publicKey, challenge, submission, systemProgram: SystemProgram.programId }).signers([user]).rpc();
  const [completion] = PublicKey.findProgramAddressSync([Buffer.from("completion"), ule64(challengeId), user.publicKey.toBuffer()], COHORT);
  await sleep(2200);
  const artifact = sha(Buffer.from("shipped artifact"));
  await cohort.methods.completeBuild([...artifact]).accounts({
    user: user.publicKey, challenge, submission, completion, campaign, userProgress: progress,
    sourceAuthority, builderloopProgram: BUILDERLOOP, systemProgram: SystemProgram.programId,
  }).signers([user]).rpc();
  assert.deepEqual((await builder.account.userProgress.fetch(progress)).stage, { shipped: {} });
  await expectFailure(cohort.methods.completeBuild([...artifact]).accounts({ user: user.publicKey, challenge, submission, completion, campaign, userProgress: progress, sourceAuthority, builderloopProgram: BUILDERLOOP, systemProgram: SystemProgram.programId }).signers([user]).rpc(), "duplicate completion");

  const mint = await createMint(provider.connection, rewardAuthority, rewardAuthority.publicKey, null, 6);
  const source = await createAccount(provider.connection, rewardAuthority, mint, rewardAuthority.publicKey);
  const recipient = await createAccount(provider.connection, user, mint, user.publicKey);
  await mintTo(provider.connection, rewardAuthority, mint, source, rewardAuthority, 2_000_000);
  const rewardId = 3;
  const [reward] = PublicKey.findProgramAddressSync([Buffer.from("reward"), campaign.toBuffer(), rewardAuthority.publicKey.toBuffer(), ule64(rewardId)], BUILDERLOOP);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), reward.toBuffer()], BUILDERLOOP);
  const rewardArgs = { rewardId: new anchor.BN(rewardId), amountPerClaim: new anchor.BN(1_000_000), maxClaims: 1, startsAt: new anchor.BN(start), endsAt: new anchor.BN(start + 100) };
  await builder.methods.createReward(rewardArgs).accounts({ rewardAuthority: rewardAuthority.publicKey, campaign, mint, reward, vault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([rewardAuthority]).rpc();
  await expectFailure(builder.methods.activateReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward, vault }).signers([rewardAuthority]).rpc(), "activation without funding");
  await builder.methods.fundReward(new anchor.BN(1_000_000)).accounts({ rewardAuthority: rewardAuthority.publicKey, reward, mint, source, vault, tokenProgram: TOKEN_PROGRAM_ID }).signers([rewardAuthority]).rpc();
  await builder.methods.activateReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward, vault }).signers([rewardAuthority]).rpc();
  const [claim] = PublicKey.findProgramAddressSync([Buffer.from("claim"), reward.toBuffer(), user.publicKey.toBuffer()], BUILDERLOOP);
  const [attackerClaim] = PublicKey.findProgramAddressSync([Buffer.from("claim"), reward.toBuffer(), attacker.publicKey.toBuffer()], BUILDERLOOP);
  const attackerRecipient = await createAccount(provider.connection, attacker, mint, attacker.publicKey);
  await expectFailure(builder.methods.claimReward().accounts({ wallet: attacker.publicKey, campaign, userProgress: attackerProgress, reward, mint, vault, recipient: attackerRecipient, claim: attackerClaim, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([attacker]).rpc(), "claim before Shipped");
  await expectFailure(builder.methods.claimReward().accounts({ wallet: user.publicKey, campaign, userProgress: progress, reward, mint, vault, recipient: source, claim, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([user]).rpc(), "recipient owned by another wallet");
  await builder.methods.pauseReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward, vault }).signers([rewardAuthority]).rpc();
  await expectFailure(builder.methods.claimReward().accounts({ wallet: user.publicKey, campaign, userProgress: progress, reward, mint, vault, recipient, claim, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([user]).rpc(), "claim while paused");
  await builder.methods.resumeReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward, vault }).signers([rewardAuthority]).rpc();
  await builder.methods.claimReward().accounts({ wallet: user.publicKey, campaign, userProgress: progress, reward, mint, vault, recipient, claim, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([user]).rpc();
  assert.equal((await getAccount(provider.connection, recipient)).amount, 1_000_000n);
  await expectFailure(builder.methods.claimReward().accounts({ wallet: user.publicKey, campaign, userProgress: progress, reward, mint, vault, recipient, claim, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([user]).rpc(), "duplicate claim");

  const closingRewardId = 4;
  const [closingReward] = PublicKey.findProgramAddressSync([Buffer.from("reward"), campaign.toBuffer(), rewardAuthority.publicKey.toBuffer(), ule64(closingRewardId)], BUILDERLOOP);
  const [closingVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), closingReward.toBuffer()], BUILDERLOOP);
  const closingEnds = Math.floor(Date.now() / 1000) + 3;
  await builder.methods.createReward({ rewardId: new anchor.BN(closingRewardId), amountPerClaim: new anchor.BN(500_000), maxClaims: 2, startsAt: new anchor.BN(start), endsAt: new anchor.BN(closingEnds) }).accounts({ rewardAuthority: rewardAuthority.publicKey, campaign, mint, reward: closingReward, vault: closingVault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([rewardAuthority]).rpc();
  await builder.methods.fundReward(new anchor.BN(1_000_000)).accounts({ rewardAuthority: rewardAuthority.publicKey, reward: closingReward, mint, source, vault: closingVault, tokenProgram: TOKEN_PROGRAM_ID }).signers([rewardAuthority]).rpc();
  await builder.methods.activateReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward: closingReward, vault: closingVault }).signers([rewardAuthority]).rpc();
  await expectFailure(builder.methods.withdrawRemainingInventory().accounts({ rewardAuthority: rewardAuthority.publicKey, reward: closingReward, mint, vault: closingVault, destination: source, tokenProgram: TOKEN_PROGRAM_ID }).signers([rewardAuthority]).rpc(), "early remainder withdrawal");
  await sleep(4000);
  await builder.methods.withdrawRemainingInventory().accounts({ rewardAuthority: rewardAuthority.publicKey, reward: closingReward, mint, vault: closingVault, destination: source, tokenProgram: TOKEN_PROGRAM_ID }).signers([rewardAuthority]).rpc();
  await builder.methods.closeReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward: closingReward, vault: closingVault, tokenProgram: TOKEN_PROGRAM_ID }).signers([rewardAuthority]).rpc();
  assert.equal(await provider.connection.getAccountInfo(closingReward), null);
  assert.equal(await provider.connection.getAccountInfo(closingVault), null);

  const campaign2Id = 8;
  const [campaign2] = PublicKey.findProgramAddressSync([Buffer.from("campaign"), authority.toBuffer(), ule64(campaign2Id)], BUILDERLOOP);
  await builder.methods.createCampaign({ ...args, campaignId: new anchor.BN(campaign2Id) }).accounts({ authority, campaign: campaign2, systemProgram: SystemProgram.programId }).rpc();
  await builder.methods.freezeCampaign().accounts({ authority, campaign: campaign2 }).rpc();
  await builder.methods.startCampaign().accounts({ authority, campaign: campaign2 }).rpc();
  const [progress2] = PublicKey.findProgramAddressSync([Buffer.from("user"), campaign2.toBuffer(), attacker.publicKey.toBuffer()], BUILDERLOOP);
  await builder.methods.initUser().accounts({ wallet: attacker.publicKey, campaign: campaign2, userProgress: progress2, systemProgram: SystemProgram.programId }).signers([attacker]).rpc();

  const submitFor = async (label) => {
    const event = sha(Buffer.from(label));
    const seed = sha(Buffer.from(`${label}:seed`));
    const project = sha(Buffer.from("BUILDERLOOP_PROJECT_V1"), BUILDERLOOP.toBuffer(), campaign2.toBuffer(), attacker.publicKey.toBuffer(), seed);
    const expiry = start + 100;
    const value = { verifierEpoch: 0, eventIdHash: [...event], projectId: [...project], projectSeedHash: [...seed], metadataHash: [...metadataHash], expiresAt: new anchor.BN(expiry) };
    const bytes = Buffer.concat([Buffer.from("BUILDERLOOP_MODULE_V1"), BUILDERLOOP.toBuffer(), campaign2.toBuffer(), attacker.publicKey.toBuffer(), le32(0), event, project, seed, metadataHash, le64(expiry)]);
    const signatureInstruction = Ed25519Program.createInstructionWithPrivateKey({ privateKey: verifier.secretKey, message: bytes });
    const [moduleReceipt] = PublicKey.findProgramAddressSync([Buffer.from("module"), campaign2.toBuffer(), event], BUILDERLOOP);
    const moduleInstruction = await builder.methods.submitModuleAttestation(value).accounts({ wallet: attacker.publicKey, campaign: campaign2, userProgress: progress2, moduleReceipt, instructions: SYSVAR_INSTRUCTIONS_PUBKEY, systemProgram: SystemProgram.programId }).instruction();
    await provider.sendAndConfirm(new Transaction().add(signatureInstruction, moduleInstruction), [attacker]);
    return { moduleReceipt, signatureInstruction, moduleInstruction };
  };
  const cancelled = await submitFor("cancelled-event");
  await builder.methods.cancelPendingModule().accounts({ wallet: attacker.publicKey, campaign: campaign2, userProgress: progress2, moduleReceipt: cancelled.moduleReceipt }).signers([attacker]).rpc();
  await expectFailure(provider.sendAndConfirm(new Transaction().add(cancelled.signatureInstruction, cancelled.moduleInstruction), [attacker]), "canonical event replay after cancellation");
  const stale = await submitFor("stale-event");
  await builder.methods.deactivateVerifier().accounts({ authority, campaign: campaign2 }).rpc();
  await sleep(1200);
  await expectFailure(builder.methods.finalizeModule().accounts({ wallet: attacker.publicKey, campaign: campaign2, userProgress: progress2, moduleReceipt: stale.moduleReceipt }).signers([attacker]).rpc(), "stale receipt after verifier epoch change");
});
