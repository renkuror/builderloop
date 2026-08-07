import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAccount, createMint, getAccount, mintTo } from "@solana/spl-token";

const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const DEFAULT_RPC = "https://api.devnet.solana.com";
const DEFAULT_WALLET = "/home/user/.config/solana/builderloop-devnet.json";
const UPGRADEABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const BUILDERLOOP = new PublicKey("3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2");
const COHORT_BUILD = new PublicKey("BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF");
const HEARTBEAT_DOMAIN = "BUILDERLOOP_HEARTBEAT_ACTIVITY_V1";
const LAMPORTS_PER_SOL = 1_000_000_000;
const DEMO = Object.freeze({
  label: "DEMO CONFIGURATION — shortened 20-second Devnet heartbeat for verification",
  heartbeatSeconds: 20,
  minimumReturnInterval: 15,
  activeCredit: 300,
  streakBonus: 50,
  streakBonusCap: 4,
  decayPerMissedPeriod: 200,
  bronzeThreshold: 0,
  silverThreshold: 300,
  goldThreshold: 600,
  platinumThreshold: 850,
  rewardMinimumScore: 700,
  rewardMinimumTier: 2,
  rewardAmount: 1_000_000,
  campaignPeriodSeconds: 5,
  campaignTotalPeriods: 100,
});

const sha = (...parts) => createHash("sha256").update(Buffer.concat(parts)).digest();
const le16 = (value) => { const out = Buffer.alloc(2); out.writeUInt16LE(value); return out; };
const le32 = (value) => { const out = Buffer.alloc(4); out.writeUInt32LE(value); return out; };
const le64 = (value) => { const out = Buffer.alloc(8); out.writeBigInt64LE(BigInt(value)); return out; };
const ule64 = (value) => { const out = Buffer.alloc(8); out.writeBigUInt64LE(BigInt(value)); return out; };
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const explorerAddress = (address) => `https://explorer.solana.com/address/${address}?cluster=devnet`;
const explorerTransaction = (signature) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

function requireDevnetUrl(url) {
  const parsed = new URL(url);
  if (!parsed.hostname.includes("devnet")) throw new Error(`Refusing non-Devnet RPC URL: ${parsed.origin}`);
}

function loadPayer(path) {
  const bytes = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(bytes) || bytes.length !== 64 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error("Devnet fee payer does not contain a valid Solana keypair.");
  }
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

async function assertDevnet(connection) {
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash !== DEVNET_GENESIS_HASH) throw new Error(`Refusing non-Devnet genesis hash: ${genesisHash}`);
}

async function networkTime(connection) {
  const slot = await connection.getSlot("confirmed");
  const timestamp = await connection.getBlockTime(slot);
  if (timestamp === null) throw new Error("Devnet did not provide a block timestamp.");
  return timestamp;
}

async function waitForChainTime(connection, earliest, description) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await networkTime(connection) >= earliest) return;
    await pause(1_000);
  }
  throw new Error(`Timed out waiting for real Devnet Clock condition: ${description}`);
}

async function guardedRpc(connection, call) {
  await assertDevnet(connection);
  return call.rpc();
}

async function guardedSend(connection, provider, transaction, signers) {
  await assertDevnet(connection);
  return provider.sendAndConfirm(transaction, signers);
}

async function fundRole(connection, payer, recipient) {
  await assertDevnet(connection);
  return sendAndConfirmTransaction(
    connection,
    new Transaction().add(SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipient,
      lamports: Math.floor(0.08 * LAMPORTS_PER_SOL),
    })),
    [payer],
    { commitment: "confirmed" },
  );
}

function randomPositiveU64() {
  const value = randomBytes(8).readBigUInt64LE() & ((1n << 63n) - 1n);
  return value === 0n ? 1n : value;
}

function publicTransaction(signature, label) {
  return { label, signature, explorerUrl: explorerTransaction(signature) };
}

function publicAddress(address) {
  return { address: address.toBase58(), explorerUrl: explorerAddress(address.toBase58()) };
}

async function requireProgram(connection, programId, name) {
  const account = await connection.getAccountInfo(programId, "confirmed");
  if (!account?.executable || !account.owner.equals(UPGRADEABLE_LOADER)) throw new Error(`${name} is not an executable upgradeable program on Devnet.`);
}

function heartbeatMessage({ loyaltyConfig, campaign, wallet, verifier, verifierEpoch, policyEpoch, activityKind, activityIdHash, metadataHash, issuedAt, expiresAt }) {
  return Buffer.concat([
    Buffer.from(HEARTBEAT_DOMAIN),
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

async function expectRejection(action, label) {
  try {
    await action();
  } catch (error) {
    return { label, rejected: true, reason: String(error.message ?? error).slice(0, 500) };
  }
  throw new Error(`${label} unexpectedly succeeded.`);
}

function effectiveScoreAt(state, timestamp) {
  const elapsedPeriods = Math.floor((timestamp - state.lastMeaningfulActivityAt.toNumber()) / DEMO.heartbeatSeconds);
  const missedPeriods = Math.max(0, elapsedPeriods - 1);
  return {
    elapsedPeriods,
    missedPeriods,
    effectiveScore: Math.max(0, state.scoreAtLastSettlement - missedPeriods * DEMO.decayPerMissedPeriod),
  };
}

async function main() {
  const deployment = JSON.parse(readFileSync("deployments/devnet.json", "utf8"));
  const rpcUrl = process.env.BUILDERLOOP_DEVNET_RPC_URL ?? deployment.rpcUrl ?? DEFAULT_RPC;
  requireDevnetUrl(rpcUrl);
  if (deployment.cluster !== "devnet") throw new Error("Deployment record is not Devnet; refusing to send a transaction.");
  const connection = new Connection(rpcUrl, "confirmed");
  await assertDevnet(connection);
  const payer = loadPayer(process.env.BUILDERLOOP_DEVNET_WALLET ?? DEFAULT_WALLET);
  await requireProgram(connection, BUILDERLOOP, "BuilderLoop");
  await requireProgram(connection, COHORT_BUILD, "CohortBuild");
  if (await connection.getBalance(payer.publicKey, "confirmed") < 500_000_000) throw new Error("The dedicated Devnet payer needs at least 0.5 SOL for the heartbeat demo lifecycle.");

  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), { commitment: "confirmed", preflightCommitment: "confirmed" });
  anchor.setProvider(provider);
  const builder = new anchor.Program(JSON.parse(readFileSync("target/idl/builderloop.json", "utf8")), provider);
  if (!builder.programId.equals(BUILDERLOOP)) throw new Error("Local BuilderLoop IDL does not match the audited Devnet program ID.");

  const rewardAuthority = Keypair.generate();
  const user = Keypair.generate();
  const verifier = Keypair.generate();
  const rewardAuthorityFunding = await fundRole(connection, payer, rewardAuthority.publicKey);
  const userFunding = await fundRole(connection, payer, user.publicKey);
  const campaignId = randomPositiveU64();
  const challengeId = randomPositiveU64();
  const rewardId = randomPositiveU64();
  const startTs = (await networkTime(connection)) - 1;
  const endTs = startTs + DEMO.campaignPeriodSeconds * DEMO.campaignTotalPeriods;
  const [sourceAuthority] = PublicKey.findProgramAddressSync([Buffer.from("builderloop_authority"), BUILDERLOOP.toBuffer()], COHORT_BUILD);
  const [campaign] = PublicKey.findProgramAddressSync([Buffer.from("campaign"), payer.publicKey.toBuffer(), ule64(campaignId)], BUILDERLOOP);
  const [loyaltyConfig] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_config"), campaign.toBuffer()], BUILDERLOOP);

  const campaignCreated = await guardedRpc(connection, builder.methods.createCampaign({
    campaignId: new anchor.BN(campaignId.toString()),
    verifier: verifier.publicKey,
    rewardAuthority: rewardAuthority.publicKey,
    startTs: new anchor.BN(startTs),
    endTs: new anchor.BN(endTs),
    periodSeconds: new anchor.BN(DEMO.campaignPeriodSeconds),
    totalPeriods: DEMO.campaignTotalPeriods,
    minPeriodGap: 1,
    minElapsedSeconds: new anchor.BN(1),
    moduleChallengeDelay: new anchor.BN(1),
    moduleNamespace: 1,
    canonicalizerVersion: 1,
    sourceProgram: COHORT_BUILD,
    sourceAuthority,
    challengeId: new anchor.BN(challengeId.toString()),
  }).accounts({ authority: payer.publicKey, campaign, systemProgram: SystemProgram.programId }));
  const campaignFrozen = await guardedRpc(connection, builder.methods.freezeCampaign().accounts({ authority: payer.publicKey, campaign }));
  const campaignStarted = await guardedRpc(connection, builder.methods.startCampaign().accounts({ authority: payer.publicKey, campaign }));
  const policyCreated = await guardedRpc(connection, builder.methods.createLoyaltyConfig({
    heartbeatSeconds: new anchor.BN(DEMO.heartbeatSeconds),
    minimumReturnInterval: new anchor.BN(DEMO.minimumReturnInterval),
    activeCredit: DEMO.activeCredit,
    streakBonus: DEMO.streakBonus,
    streakBonusCap: DEMO.streakBonusCap,
    decayPerMissedPeriod: DEMO.decayPerMissedPeriod,
    bronzeThreshold: DEMO.bronzeThreshold,
    silverThreshold: DEMO.silverThreshold,
    goldThreshold: DEMO.goldThreshold,
    platinumThreshold: DEMO.platinumThreshold,
  }).accounts({ authority: payer.publicKey, campaign, loyaltyConfig, systemProgram: SystemProgram.programId }));

  await assertDevnet(connection);
  const mint = await createMint(connection, rewardAuthority, rewardAuthority.publicKey, null, 6);
  await assertDevnet(connection);
  const source = await createAccount(connection, rewardAuthority, mint, rewardAuthority.publicKey);
  await assertDevnet(connection);
  const recipient = await createAccount(connection, user, mint, user.publicKey);
  await assertDevnet(connection);
  await mintTo(connection, rewardAuthority, mint, source, rewardAuthority, DEMO.rewardAmount);
  const [reward] = PublicKey.findProgramAddressSync([Buffer.from("reward"), campaign.toBuffer(), rewardAuthority.publicKey.toBuffer(), ule64(rewardId)], BUILDERLOOP);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), reward.toBuffer()], BUILDERLOOP);
  const [loyaltyRewardGate] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_reward_gate"), reward.toBuffer()], BUILDERLOOP);
  const rewardNow = await networkTime(connection);
  const rewardCreated = await guardedRpc(connection, builder.methods.createReward({
    rewardId: new anchor.BN(rewardId.toString()),
    amountPerClaim: new anchor.BN(DEMO.rewardAmount),
    maxClaims: 1,
    startsAt: new anchor.BN(rewardNow - 1),
    endsAt: new anchor.BN(Math.min(endTs - 1, rewardNow + 300)),
  }).accounts({ rewardAuthority: rewardAuthority.publicKey, campaign, mint, reward, vault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([rewardAuthority]));
  const loyaltyRewardGateCreated = await guardedRpc(connection, builder.methods.createLoyaltyRewardGate({
    minimumScore: DEMO.rewardMinimumScore,
    minimumTier: DEMO.rewardMinimumTier,
  }).accounts({ rewardAuthority: rewardAuthority.publicKey, campaign, reward, loyaltyConfig, loyaltyRewardGate, mint, vault, systemProgram: SystemProgram.programId }).signers([rewardAuthority]));
  const rewardFunded = await guardedRpc(connection, builder.methods.fundReward(new anchor.BN(DEMO.rewardAmount)).accounts({ rewardAuthority: rewardAuthority.publicKey, reward, mint, source, vault, tokenProgram: TOKEN_PROGRAM_ID }).signers([rewardAuthority]));
  const rewardActivated = await guardedRpc(connection, builder.methods.activateReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward, vault }).signers([rewardAuthority]));
  const [loyaltyState] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_state"), loyaltyConfig.toBuffer(), user.publicKey.toBuffer()], BUILDERLOOP);

  const recordActivity = async (label) => {
    const now = await networkTime(connection);
    const activityIdHash = sha(Buffer.from("builderloop-heartbeat-demo"), Buffer.from(label), randomBytes(32));
    const metadataHash = sha(Buffer.from("meaningful-activity"), Buffer.from(label));
    const issuedAt = now - 1;
    const expiresAt = now + 60;
    const voucher = {
      verifierEpoch: 0,
      policyEpoch: 1,
      activityKind: 1,
      activityIdHash: [...activityIdHash],
      metadataHash: [...metadataHash],
      issuedAt: new anchor.BN(issuedAt),
      expiresAt: new anchor.BN(expiresAt),
    };
    const [activityReceipt] = PublicKey.findProgramAddressSync([Buffer.from("activity"), loyaltyConfig.toBuffer(), user.publicKey.toBuffer(), activityIdHash], BUILDERLOOP);
    const signature = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: verifier.secretKey,
      message: heartbeatMessage({ loyaltyConfig, campaign, wallet: user.publicKey, verifier: verifier.publicKey, verifierEpoch: 0, policyEpoch: 1, activityKind: 1, activityIdHash, metadataHash, issuedAt, expiresAt }),
    });
    const instruction = await builder.methods.recordVerifiedActivity(voucher).accounts({
      wallet: user.publicKey,
      campaign,
      loyaltyConfig,
      loyaltyState,
      activityReceipt,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      systemProgram: SystemProgram.programId,
    }).instruction();
    return { activityReceipt, transaction: new Transaction().add(signature, instruction) };
  };

  const first = await recordActivity("first");
  const firstActivity = await guardedSend(connection, provider, first.transaction, [user]);
  const firstState = await builder.account.loyaltyState.fetch(loyaltyState);
  if (firstState.scoreAtLastSettlement !== 350 || firstState.streak !== 1) throw new Error("First activity did not initialize the expected loyalty state.");
  const insufficientClaim = await expectRejection(() => guardedRpc(connection, builder.methods.claimLoyaltyReward().accounts({
    wallet: user.publicKey,
    campaign,
    loyaltyConfig,
    loyaltyState,
    reward,
    loyaltyRewardGate,
    mint,
    vault,
    recipient,
    claim: PublicKey.findProgramAddressSync([Buffer.from("claim"), reward.toBuffer(), user.publicKey.toBuffer()], BUILDERLOOP)[0],
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }).signers([user])), "insufficient loyalty claim");
  const early = await recordActivity("early");
  const antiBurst = await expectRejection(() => guardedSend(connection, provider, early.transaction, [user]), "too-early repeated activity");
  await waitForChainTime(connection, firstState.lastMeaningfulActivityAt.toNumber() + DEMO.minimumReturnInterval, "minimum heartbeat return interval");
  const second = await recordActivity("second");
  const secondActivity = await guardedSend(connection, provider, second.transaction, [user]);
  const secondState = await builder.account.loyaltyState.fetch(loyaltyState);
  if (secondState.scoreAtLastSettlement !== 750 || secondState.streak !== 2 || secondState.totalCountedActivities !== 2) throw new Error("Second valid return did not reach the expected Gold loyalty state.");
  const [claim] = PublicKey.findProgramAddressSync([Buffer.from("claim"), reward.toBuffer(), user.publicKey.toBuffer()], BUILDERLOOP);
  const loyaltyRewardClaimed = await guardedRpc(connection, builder.methods.claimLoyaltyReward().accounts({
    wallet: user.publicKey,
    campaign,
    loyaltyConfig,
    loyaltyState,
    reward,
    loyaltyRewardGate,
    mint,
    vault,
    recipient,
    claim,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }).signers([user]));
  const duplicateClaim = await expectRejection(() => guardedRpc(connection, builder.methods.claimLoyaltyReward().accounts({
    wallet: user.publicKey,
    campaign,
    loyaltyConfig,
    loyaltyState,
    reward,
    loyaltyRewardGate,
    mint,
    vault,
    recipient,
    claim,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }).signers([user])), "duplicate loyalty claim");
  await waitForChainTime(connection, secondState.lastMeaningfulActivityAt.toNumber() + DEMO.heartbeatSeconds * 2, "lazy decay observation");
  const lazyDecayObservedAt = await networkTime(connection);
  const lazyDecay = effectiveScoreAt(secondState, lazyDecayObservedAt);
  if (lazyDecay.missedPeriods < 1 || lazyDecay.effectiveScore >= secondState.scoreAtLastSettlement) throw new Error("Devnet Clock did not expose the expected lazy decay.");
  await assertDevnet(connection);
  const recipientAccount = await getAccount(connection, recipient, "confirmed");
  if (recipientAccount.amount !== BigInt(DEMO.rewardAmount)) throw new Error("Loyalty-gated reward transfer did not reach the signer-owned recipient account.");

  const [campaignAccount, configAccount, stateAccount, firstReceiptAccount, secondReceiptAccount, gateAccount, rewardAccount, claimAccount] = await Promise.all([
    connection.getAccountInfo(campaign, "confirmed"),
    connection.getAccountInfo(loyaltyConfig, "confirmed"),
    connection.getAccountInfo(loyaltyState, "confirmed"),
    connection.getAccountInfo(first.activityReceipt, "confirmed"),
    connection.getAccountInfo(second.activityReceipt, "confirmed"),
    connection.getAccountInfo(loyaltyRewardGate, "confirmed"),
    connection.getAccountInfo(reward, "confirmed"),
    connection.getAccountInfo(claim, "confirmed"),
  ]);
  if (![campaignAccount, configAccount, stateAccount, firstReceiptAccount, secondReceiptAccount, gateAccount, rewardAccount, claimAccount].every(Boolean)) throw new Error("A required Heartbeat Loyalty Devnet account was not found after the demo.");
  if (![campaignAccount, configAccount, stateAccount, firstReceiptAccount, secondReceiptAccount, gateAccount, rewardAccount, claimAccount].every((account) => account.owner.equals(BUILDERLOOP))) throw new Error("A required Heartbeat Loyalty Devnet account has the wrong owner.");

  const transactions = {
    rewardAuthorityFunding: publicTransaction(rewardAuthorityFunding, "Fund heartbeat DEMO reward authority"),
    userFunding: publicTransaction(userFunding, "Fund heartbeat DEMO participant"),
    campaignCreated: publicTransaction(campaignCreated, "Create heartbeat campaign"),
    campaignFrozen: publicTransaction(campaignFrozen, "Freeze heartbeat campaign"),
    campaignStarted: publicTransaction(campaignStarted, "Start heartbeat campaign"),
    policyCreated: publicTransaction(policyCreated, "Create immutable HeartbeatPolicy"),
    rewardCreated: publicTransaction(rewardCreated, "Create loyalty-gated fixed SPL Reward"),
    loyaltyRewardGateCreated: publicTransaction(loyaltyRewardGateCreated, "Create frozen LoyaltyRewardGate"),
    rewardFunded: publicTransaction(rewardFunded, "Fund loyalty-gated fixed SPL Reward"),
    rewardActivated: publicTransaction(rewardActivated, "Activate loyalty-gated fixed SPL Reward"),
    firstActivity: publicTransaction(firstActivity, "Record first verified meaningful activity"),
    secondActivity: publicTransaction(secondActivity, "Record second valid heartbeat return"),
    loyaltyRewardClaimed: publicTransaction(loyaltyRewardClaimed, "Claim loyalty-gated fixed SPL Reward"),
  };
  const heartbeatDemo = {
    status: "complete",
    label: DEMO.label,
    campaign: campaign.toBase58(),
    loyaltyConfig: loyaltyConfig.toBase58(),
    user: user.publicKey.toBase58(),
    loyaltyState: loyaltyState.toBase58(),
    activityReceipts: [first.activityReceipt.toBase58(), second.activityReceipt.toBase58()],
    reward: reward.toBase58(),
    loyaltyRewardGate: loyaltyRewardGate.toBase58(),
    rewardVault: vault.toBase58(),
    mint: mint.toBase58(),
    recipient: recipient.toBase58(),
    claim: claim.toBase58(),
    timing: {
      heartbeatSeconds: DEMO.heartbeatSeconds,
      minimumReturnInterval: DEMO.minimumReturnInterval,
      shortHeartbeatForDevnetVerification: true,
    },
    policy: {
      activeCredit: DEMO.activeCredit,
      streakBonus: DEMO.streakBonus,
      streakBonusCap: DEMO.streakBonusCap,
      decayPerMissedPeriod: DEMO.decayPerMissedPeriod,
      bronzeThreshold: DEMO.bronzeThreshold,
      silverThreshold: DEMO.silverThreshold,
      goldThreshold: DEMO.goldThreshold,
      platinumThreshold: DEMO.platinumThreshold,
      policyEpoch: 1,
      rewardMinimumScore: DEMO.rewardMinimumScore,
      rewardMinimumTier: DEMO.rewardMinimumTier,
      scoreAfterSecondActivity: secondState.scoreAtLastSettlement,
      streakAfterSecondActivity: secondState.streak,
    },
    lazyDecayObservation: {
      observedAt: lazyDecayObservedAt,
      ...lazyDecay,
    },
    checks: {
      antiBurst,
      insufficientClaim,
      duplicateClaim,
    },
    transactions: {
      policyCreated: transactions.policyCreated,
      firstActivity: transactions.firstActivity,
      secondActivity: transactions.secondActivity,
      loyaltyRewardClaimed: transactions.loyaltyRewardClaimed,
    },
  };
  const heartbeatAddresses = {
    campaign: publicAddress(campaign),
    loyaltyConfig: publicAddress(loyaltyConfig),
    user: publicAddress(user.publicKey),
    loyaltyState: publicAddress(loyaltyState),
    firstActivityReceipt: publicAddress(first.activityReceipt),
    secondActivityReceipt: publicAddress(second.activityReceipt),
    reward: publicAddress(reward),
    loyaltyRewardGate: publicAddress(loyaltyRewardGate),
    rewardVault: publicAddress(vault),
    mint: publicAddress(mint),
    recipient: publicAddress(recipient),
    claim: publicAddress(claim),
  };
  const nextDeployment = { ...deployment, status: "deployed", cluster: "devnet", rpcUrl, heartbeatDemo };
  const priorAddresses = JSON.parse(readFileSync("evidence/devnet-addresses.json", "utf8"));
  const priorLinks = JSON.parse(readFileSync("evidence/transaction-links.json", "utf8"));
  const nextAddresses = { ...priorAddresses, status: "deployed", cluster: "devnet", heartbeat: heartbeatAddresses };
  const nextLinks = { ...priorLinks, status: "deployed", cluster: "devnet", transactions: { ...priorLinks.transactions, heartbeatPolicyCreated: transactions.policyCreated, heartbeatFirstActivity: transactions.firstActivity, heartbeatSecondActivity: transactions.secondActivity, heartbeatLoyaltyRewardClaimed: transactions.loyaltyRewardClaimed } };
  mkdirSync("deployments", { recursive: true });
  mkdirSync("evidence", { recursive: true });
  writeFileSync("deployments/devnet.json", `${JSON.stringify(nextDeployment, null, 2)}\n`);
  writeFileSync("evidence/devnet-addresses.json", `${JSON.stringify(nextAddresses, null, 2)}\n`);
  writeFileSync("evidence/transaction-links.json", `${JSON.stringify(nextLinks, null, 2)}\n`);
  console.log(JSON.stringify({ status: "verified", cluster: "devnet", heartbeatDemo, transactions }, null, 2));
}

await main();
