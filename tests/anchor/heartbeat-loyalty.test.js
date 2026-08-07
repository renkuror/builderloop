import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as anchor from "@coral-xyz/anchor";
import { Ed25519Program, Keypair, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, SystemProgram, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAccount, createMint, getAccount, mintTo } from "@solana/spl-token";

const BUILDERLOOP = new PublicKey("3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2");
const COHORT = new PublicKey("BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF");
const HEARTBEAT_DOMAIN = "BUILDERLOOP_HEARTBEAT_ACTIVITY_V1";
const sha = (...parts) => createHash("sha256").update(Buffer.concat(parts)).digest();
const le16 = (n) => { const bytes = Buffer.alloc(2); bytes.writeUInt16LE(n); return bytes; };
const le32 = (n) => { const bytes = Buffer.alloc(4); bytes.writeUInt32LE(n); return bytes; };
const le64 = (n) => { const bytes = Buffer.alloc(8); bytes.writeBigInt64LE(BigInt(n)); return bytes; };
const ule64 = (n) => { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(BigInt(n)); return bytes; };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function expectFailure(promise, label) {
  await assert.rejects(promise, (error) => {
    assert.ok(error, `${label} should fail`);
    return true;
  });
}

async function networkTime(connection) {
  const slot = await connection.getSlot("confirmed");
  return (await connection.getBlockTime(slot)) ?? Math.floor(Date.now() / 1_000);
}

function activityMessage({ loyaltyConfig, campaign, wallet, verifier, verifierEpoch, policyEpoch, activityKind, activityIdHash, metadataHash, issuedAt, expiresAt, domain = HEARTBEAT_DOMAIN }) {
  return Buffer.concat([
    Buffer.from(domain),
    BUILDERLOOP.toBuffer(),
    loyaltyConfig.toBuffer(),
    campaign.toBuffer(),
    wallet.toBuffer(),
    verifier.toBuffer(),
    le32(verifierEpoch),
    le32(policyEpoch),
    le16(activityKind),
    activityIdHash,
    metadataHash,
    le64(issuedAt),
    le64(expiresAt),
  ]);
}

test("local validator enforces heartbeat loyalty, replay resistance, lazy decay, and reward gating", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const builder = new anchor.Program(JSON.parse(readFileSync("target/idl/builderloop.json", "utf8")), provider);
  const authority = provider.wallet.publicKey;
  const user = Keypair.generate();
  const attacker = Keypair.generate();
  const rewardAuthority = Keypair.generate();
  const verifier = Keypair.generate();
  for (const key of [user.publicKey, attacker.publicKey, rewardAuthority.publicKey]) {
    const signature = await provider.connection.requestAirdrop(key, 3 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(signature, "confirmed");
  }

  const campaignId = 701;
  const challengeId = 702;
  const [sourceAuthority] = PublicKey.findProgramAddressSync([Buffer.from("builderloop_authority"), BUILDERLOOP.toBuffer()], COHORT);
  const [campaign] = PublicKey.findProgramAddressSync([Buffer.from("campaign"), authority.toBuffer(), ule64(campaignId)], BUILDERLOOP);
  const start = (await networkTime(provider.connection)) - 1;
  await builder.methods.createCampaign({
    campaignId: new anchor.BN(campaignId),
    verifier: verifier.publicKey,
    rewardAuthority: rewardAuthority.publicKey,
    startTs: new anchor.BN(start),
    endTs: new anchor.BN(start + 180),
    periodSeconds: new anchor.BN(3),
    totalPeriods: 60,
    minPeriodGap: 1,
    minElapsedSeconds: new anchor.BN(1),
    moduleChallengeDelay: new anchor.BN(1),
    moduleNamespace: 1,
    canonicalizerVersion: 1,
    sourceProgram: COHORT,
    sourceAuthority,
    challengeId: new anchor.BN(challengeId),
  }).accounts({ authority, campaign, systemProgram: SystemProgram.programId }).rpc();
  await builder.methods.freezeCampaign().accounts({ authority, campaign }).rpc();
  await builder.methods.startCampaign().accounts({ authority, campaign }).rpc();

  const [loyaltyConfig] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_config"), campaign.toBuffer()], BUILDERLOOP);
  const policyArgs = {
    heartbeatSeconds: new anchor.BN(3),
    minimumReturnInterval: new anchor.BN(2),
    activeCredit: 300,
    streakBonus: 50,
    streakBonusCap: 4,
    decayPerMissedPeriod: 200,
    bronzeThreshold: 0,
    silverThreshold: 300,
    goldThreshold: 600,
    platinumThreshold: 850,
  };
  const createPolicy = (args = policyArgs, signer = authority) => builder.methods.createLoyaltyConfig(args).accounts({
    authority: signer,
    campaign,
    loyaltyConfig,
    systemProgram: SystemProgram.programId,
  }).signers(signer.equals(authority) ? [] : [attacker]).rpc();
  await expectFailure(createPolicy({ ...policyArgs, heartbeatSeconds: new anchor.BN(0) }), "zero heartbeat");
  await expectFailure(createPolicy({ ...policyArgs, minimumReturnInterval: new anchor.BN(0) }), "zero minimum interval");
  await expectFailure(createPolicy({ ...policyArgs, minimumReturnInterval: new anchor.BN(4) }), "invalid minimum interval");
  await expectFailure(createPolicy({ ...policyArgs, goldThreshold: 300 }), "invalid tiers");
  await expectFailure(createPolicy({ ...policyArgs, activeCredit: 900 }), "unsafe score credit");
  await expectFailure(createPolicy(policyArgs, attacker.publicKey), "wrong policy authority");
  await createPolicy();
  const policy = await builder.account.loyaltyConfig.fetch(loyaltyConfig);
  assert.equal(policy.heartbeatSeconds.toNumber(), 3);
  assert.equal(policy.minimumReturnInterval.toNumber(), 2);
  assert.equal(policy.policyEpoch, 1);
  assert.notDeepEqual(Buffer.from(policy.configHash), Buffer.alloc(32));
  await expectFailure(createPolicy(), "immutable policy PDA");

  const mint = await createMint(provider.connection, rewardAuthority, rewardAuthority.publicKey, null, 6);
  const source = await createAccount(provider.connection, rewardAuthority, mint, rewardAuthority.publicKey);
  const recipient = await createAccount(provider.connection, user, mint, user.publicKey);
  const attackerRecipient = await createAccount(provider.connection, attacker, mint, attacker.publicKey);
  await mintTo(provider.connection, rewardAuthority, mint, source, rewardAuthority, 1_000_000);
  const rewardId = 703;
  const [reward] = PublicKey.findProgramAddressSync([Buffer.from("reward"), campaign.toBuffer(), rewardAuthority.publicKey.toBuffer(), ule64(rewardId)], BUILDERLOOP);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), reward.toBuffer()], BUILDERLOOP);
  const [loyaltyRewardGate] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_reward_gate"), reward.toBuffer()], BUILDERLOOP);
  const rewardNow = await networkTime(provider.connection);
  await builder.methods.createReward({
    rewardId: new anchor.BN(rewardId),
    amountPerClaim: new anchor.BN(1_000_000),
    maxClaims: 1,
    startsAt: new anchor.BN(rewardNow - 1),
    endsAt: new anchor.BN(rewardNow + 120),
  }).accounts({ rewardAuthority: rewardAuthority.publicKey, campaign, mint, reward, vault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([rewardAuthority]).rpc();
  await builder.methods.createLoyaltyRewardGate({ minimumScore: 700, minimumTier: 2 }).accounts({
    rewardAuthority: rewardAuthority.publicKey,
    campaign,
    reward,
    loyaltyConfig,
    loyaltyRewardGate,
    mint,
    vault,
    systemProgram: SystemProgram.programId,
  }).signers([rewardAuthority]).rpc();
  await builder.methods.fundReward(new anchor.BN(1_000_000)).accounts({ rewardAuthority: rewardAuthority.publicKey, reward, mint, source, vault, tokenProgram: TOKEN_PROGRAM_ID }).signers([rewardAuthority]).rpc();
  await builder.methods.activateReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward, vault }).signers([rewardAuthority]).rpc();

  const buildActivity = async ({ wallet = user, messageWallet = wallet, event = "activity", signer = verifier, domain, verifierEpoch = 0, policyEpoch = 1, issuedAt, expiresAt, accountCampaign = campaign, accountLoyaltyConfig = loyaltyConfig } = {}) => {
    const now = await networkTime(provider.connection);
    const activityIdHash = sha(Buffer.from(`heartbeat:${event}`));
    const metadataHash = sha(Buffer.from(`metadata:${event}`));
    const voucher = {
      verifierEpoch,
      policyEpoch,
      activityKind: 1,
      activityIdHash: [...activityIdHash],
      metadataHash: [...metadataHash],
      issuedAt: new anchor.BN(issuedAt ?? now - 1),
      expiresAt: new anchor.BN(expiresAt ?? now + 30),
    };
    const [loyaltyState] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_state"), accountLoyaltyConfig.toBuffer(), wallet.publicKey.toBuffer()], BUILDERLOOP);
    const [activityReceipt] = PublicKey.findProgramAddressSync([Buffer.from("activity"), accountLoyaltyConfig.toBuffer(), wallet.publicKey.toBuffer(), activityIdHash], BUILDERLOOP);
    const message = activityMessage({
      loyaltyConfig,
      campaign,
      wallet: messageWallet.publicKey,
      verifier: verifier.publicKey,
      verifierEpoch,
      policyEpoch,
      activityKind: 1,
      activityIdHash,
      metadataHash,
      issuedAt: voucher.issuedAt.toNumber(),
      expiresAt: voucher.expiresAt.toNumber(),
      domain,
    });
    const signature = Ed25519Program.createInstructionWithPrivateKey({ privateKey: signer.secretKey, message });
    const instruction = await builder.methods.recordVerifiedActivity(voucher).accounts({
      wallet: wallet.publicKey,
      campaign: accountCampaign,
      loyaltyConfig: accountLoyaltyConfig,
      loyaltyState,
      activityReceipt,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      systemProgram: SystemProgram.programId,
    }).instruction();
    return { activityIdHash, activityReceipt, instruction, loyaltyState, signature, transaction: new Transaction().add(signature, instruction) };
  };

  const wrongVerifier = await buildActivity({ event: "wrong-verifier", signer: attacker });
  await expectFailure(provider.sendAndConfirm(wrongVerifier.transaction, [user]), "wrong verifier");
  const wrongWallet = await buildActivity({ event: "wrong-wallet", wallet: attacker, messageWallet: user });
  await expectFailure(provider.sendAndConfirm(wrongWallet.transaction, [attacker]), "wrong wallet voucher");
  const wrongEpoch = await buildActivity({ event: "wrong-epoch", policyEpoch: 2 });
  await expectFailure(provider.sendAndConfirm(wrongEpoch.transaction, [user]), "wrong policy epoch");
  const beforeActivation = await buildActivity({ event: "before-activation", issuedAt: policy.activatedAt.toNumber() - 1 });
  await expectFailure(provider.sendAndConfirm(beforeActivation.transaction, [user]), "voucher issued before policy activation");
  const expiredAt = (await networkTime(provider.connection)) - 1;
  const expired = await buildActivity({ event: "expired", issuedAt: expiredAt - 1, expiresAt: expiredAt });
  await expectFailure(provider.sendAndConfirm(expired.transaction, [user]), "expired activity voucher");
  const wrongDomain = await buildActivity({ event: "wrong-domain", domain: "BUILDERLOOP_HEARTBEAT_ACTIVITY_V0" });
  await expectFailure(provider.sendAndConfirm(wrongDomain.transaction, [user]), "wrong activity domain");
  const malformed = await buildActivity({ event: "malformed" });
  malformed.signature.data.writeUInt16LE(111, 10);
  await expectFailure(provider.sendAndConfirm(new Transaction().add(malformed.signature, malformed.instruction), [user]), "malformed Ed25519 offsets");
  const wrongConfig = await buildActivity({ event: "wrong-config-account", accountLoyaltyConfig: campaign });
  await expectFailure(provider.sendAndConfirm(wrongConfig.transaction, [user]), "wrong loyalty config account");
  const wrongCampaign = await buildActivity({ event: "wrong-campaign-account", accountCampaign: loyaltyConfig });
  await expectFailure(provider.sendAndConfirm(wrongCampaign.transaction, [user]), "wrong campaign account");

  const first = await buildActivity({ event: "first" });
  await provider.sendAndConfirm(first.transaction, [user]);
  let state = await builder.account.loyaltyState.fetch(first.loyaltyState);
  assert.equal(state.scoreAtLastSettlement, 350);
  assert.equal(state.streak, 1);
  assert.equal(state.totalCountedActivities, 1);
  assert.equal(state.wallet.toBase58(), user.publicKey.toBase58());
  await expectFailure(provider.sendAndConfirm(first.transaction, [user]), "replayed activity receipt");
  const early = await buildActivity({ event: "early" });
  await expectFailure(provider.sendAndConfirm(early.transaction, [user]), "anti-burst activity");

  const [claim] = PublicKey.findProgramAddressSync([Buffer.from("claim"), reward.toBuffer(), user.publicKey.toBuffer()], BUILDERLOOP);
  const loyaltyClaim = () => builder.methods.claimLoyaltyReward().accounts({
    wallet: user.publicKey,
    campaign,
    loyaltyConfig,
    loyaltyState: first.loyaltyState,
    reward,
    loyaltyRewardGate,
    mint,
    vault,
    recipient,
    claim,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }).signers([user]).rpc();
  await expectFailure(loyaltyClaim(), "insufficient effective loyalty");
  await expectFailure(builder.methods.claimLoyaltyReward().accounts({
    wallet: user.publicKey,
    campaign,
    loyaltyConfig,
    loyaltyState: first.loyaltyState,
    reward,
    loyaltyRewardGate,
    mint,
    vault,
    recipient: attackerRecipient,
    claim,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }).signers([user]).rpc(), "recipient owned by another wallet");
  const wrongMint = await createMint(provider.connection, rewardAuthority, rewardAuthority.publicKey, null, 6);
  await expectFailure(builder.methods.claimLoyaltyReward().accounts({
    wallet: user.publicKey,
    campaign,
    loyaltyConfig,
    loyaltyState: first.loyaltyState,
    reward,
    loyaltyRewardGate,
    mint: wrongMint,
    vault,
    recipient,
    claim,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }).signers([user]).rpc(), "wrong reward mint");
  await expectFailure(builder.methods.claimLoyaltyReward().accounts({
    wallet: user.publicKey,
    campaign,
    loyaltyConfig,
    loyaltyState: first.loyaltyState,
    reward,
    loyaltyRewardGate,
    mint,
    vault: source,
    recipient,
    claim,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }).signers([user]).rpc(), "wrong reward vault");
  await expectFailure(builder.methods.claimLoyaltyReward().accounts({
    wallet: user.publicKey,
    campaign,
    loyaltyConfig,
    loyaltyState: first.loyaltyState,
    reward,
    loyaltyRewardGate: reward,
    mint,
    vault,
    recipient,
    claim,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }).signers([user]).rpc(), "wrong loyalty reward gate");

  await sleep(2_500);
  const second = await buildActivity({ event: "second" });
  await provider.sendAndConfirm(second.transaction, [user]);
  state = await builder.account.loyaltyState.fetch(second.loyaltyState);
  assert.equal(state.scoreAtLastSettlement, 750);
  assert.equal(state.streak, 2);
  assert.equal(state.totalCountedActivities, 2);
  await loyaltyClaim();
  assert.equal((await getAccount(provider.connection, recipient)).amount, 1_000_000n);
  await expectFailure(loyaltyClaim(), "duplicate loyalty claim");

  const expiryRewardId = 704;
  const [expiryReward] = PublicKey.findProgramAddressSync([Buffer.from("reward"), campaign.toBuffer(), rewardAuthority.publicKey.toBuffer(), ule64(expiryRewardId)], BUILDERLOOP);
  const [expiryVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), expiryReward.toBuffer()], BUILDERLOOP);
  const [expiryGate] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_reward_gate"), expiryReward.toBuffer()], BUILDERLOOP);
  const expiryNow = await networkTime(provider.connection);
  await mintTo(provider.connection, rewardAuthority, mint, source, rewardAuthority, 1_000_000);
  await builder.methods.createReward({
    rewardId: new anchor.BN(expiryRewardId),
    amountPerClaim: new anchor.BN(1_000_000),
    maxClaims: 1,
    startsAt: new anchor.BN(expiryNow - 1),
    endsAt: new anchor.BN(expiryNow + 8),
  }).accounts({ rewardAuthority: rewardAuthority.publicKey, campaign, mint, reward: expiryReward, vault: expiryVault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([rewardAuthority]).rpc();
  await builder.methods.createLoyaltyRewardGate({ minimumScore: 300, minimumTier: 1 }).accounts({
    rewardAuthority: rewardAuthority.publicKey,
    campaign,
    reward: expiryReward,
    loyaltyConfig,
    loyaltyRewardGate: expiryGate,
    mint,
    vault: expiryVault,
    systemProgram: SystemProgram.programId,
  }).signers([rewardAuthority]).rpc();
  await builder.methods.fundReward(new anchor.BN(1_000_000)).accounts({ rewardAuthority: rewardAuthority.publicKey, reward: expiryReward, mint, source, vault: expiryVault, tokenProgram: TOKEN_PROGRAM_ID }).signers([rewardAuthority]).rpc();
  await builder.methods.activateReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward: expiryReward, vault: expiryVault }).signers([rewardAuthority]).rpc();
  const [expiryClaim] = PublicKey.findProgramAddressSync([Buffer.from("claim"), expiryReward.toBuffer(), user.publicKey.toBuffer()], BUILDERLOOP);
  await sleep(8_500);
  await expectFailure(builder.methods.claimLoyaltyReward().accounts({
    wallet: user.publicKey,
    campaign,
    loyaltyConfig,
    loyaltyState: first.loyaltyState,
    reward: expiryReward,
    loyaltyRewardGate: expiryGate,
    mint,
    vault: expiryVault,
    recipient,
    claim: expiryClaim,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }).signers([user]).rpc(), "expired loyalty reward");

  const stateBeforeDecay = await builder.account.loyaltyState.fetch(second.loyaltyState);
  await sleep(7_000);
  const third = await buildActivity({ event: "after-decay" });
  await provider.sendAndConfirm(third.transaction, [user]);
  const receiptAfterDecay = await builder.account.activityReceipt.fetch(third.activityReceipt);
  state = await builder.account.loyaltyState.fetch(third.loyaltyState);
  const elapsedPeriods = Math.floor((receiptAfterDecay.creditedAt.toNumber() - stateBeforeDecay.lastMeaningfulActivityAt.toNumber()) / 3);
  const missedPeriods = Math.max(0, elapsedPeriods - 1);
  assert.ok(missedPeriods >= 1, "shortened local Clock should expose lazy decay");
  const expectedScore = Math.min(1_000, Math.max(0, stateBeforeDecay.scoreAtLastSettlement - missedPeriods * 200) + 350);
  assert.equal(state.scoreAtLastSettlement, expectedScore);
  assert.equal(state.streak, 1);
  assert.equal(state.totalCountedActivities, 3);
});
