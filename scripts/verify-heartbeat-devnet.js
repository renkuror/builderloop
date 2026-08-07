import { readFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import { effectiveLoyalty, heartbeatConfigHash } from "../src/loyalty.js";

const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const UPGRADEABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const DISCRIMINATORS = Object.freeze({
  loyaltyConfig: Buffer.from([190, 240, 195, 182, 79, 177, 63, 71]),
  loyaltyState: Buffer.from([149, 17, 163, 1, 74, 190, 103, 111]),
  activityReceipt: Buffer.from([169, 34, 134, 108, 129, 141, 172, 14]),
  loyaltyRewardGate: Buffer.from([209, 109, 16, 173, 62, 140, 156, 105]),
});

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function publicKey(data, offset) {
  return new PublicKey(data.subarray(offset, offset + 32)).toBase58();
}

function i64(data, offset) {
  return Number(data.readBigInt64LE(offset));
}

function assertDiscriminator(data, discriminator, name) {
  if (!Buffer.from(data.subarray(0, 8)).equals(discriminator)) throw new Error(`${name} has an unexpected discriminator.`);
}

function decodeLoyaltyConfig(data) {
  const bytes = Buffer.from(data);
  if (bytes.length !== 217) throw new Error(`LoyaltyConfig has unexpected length ${bytes.length}.`);
  assertDiscriminator(bytes, DISCRIMINATORS.loyaltyConfig, "LoyaltyConfig");
  return {
    campaign: publicKey(bytes, 8),
    campaignConfigHash: bytes.subarray(40, 72).toString("hex"),
    authority: publicKey(bytes, 72),
    verifier: publicKey(bytes, 104),
    verifierEpoch: bytes.readUInt32LE(136),
    heartbeatSeconds: i64(bytes, 140),
    minimumReturnInterval: i64(bytes, 148),
    activeCredit: bytes.readUInt16LE(156),
    streakBonus: bytes.readUInt16LE(158),
    streakBonusCap: bytes.readUInt16LE(160),
    decayPerMissedPeriod: bytes.readUInt16LE(162),
    bronzeThreshold: bytes.readUInt16LE(164),
    silverThreshold: bytes.readUInt16LE(166),
    goldThreshold: bytes.readUInt16LE(168),
    platinumThreshold: bytes.readUInt16LE(170),
    policyEpoch: bytes.readUInt32LE(172),
    activatedAt: i64(bytes, 176),
    configHash: bytes.subarray(184, 216).toString("hex"),
    bump: bytes[216],
  };
}

function decodeLoyaltyState(data) {
  const bytes = Buffer.from(data);
  if (bytes.length !== 125) throw new Error(`LoyaltyState has unexpected length ${bytes.length}.`);
  assertDiscriminator(bytes, DISCRIMINATORS.loyaltyState, "LoyaltyState");
  return {
    loyaltyConfig: publicKey(bytes, 8),
    campaign: publicKey(bytes, 40),
    wallet: publicKey(bytes, 72),
    scoreAtLastSettlement: bytes.readUInt16LE(104),
    lastMeaningfulActivityAt: i64(bytes, 106),
    streak: bytes.readUInt16LE(114),
    totalCountedActivities: bytes.readUInt32LE(116),
    policyEpoch: bytes.readUInt32LE(120),
    bump: bytes[124],
  };
}

function decodeActivityReceipt(data) {
  const bytes = Buffer.from(data);
  if (bytes.length !== 199) throw new Error(`ActivityReceipt has unexpected length ${bytes.length}.`);
  assertDiscriminator(bytes, DISCRIMINATORS.activityReceipt, "ActivityReceipt");
  return {
    loyaltyConfig: publicKey(bytes, 8),
    campaign: publicKey(bytes, 40),
    wallet: publicKey(bytes, 72),
    activityIdHash: bytes.subarray(104, 136),
    activityKind: bytes.readUInt16LE(136),
    metadataHash: bytes.subarray(138, 170).toString("hex"),
    verifierEpoch: bytes.readUInt32LE(170),
    policyEpoch: bytes.readUInt32LE(174),
    issuedAt: i64(bytes, 178),
    creditedAt: i64(bytes, 186),
    scoreAfter: bytes.readUInt16LE(194),
    streakAfter: bytes.readUInt16LE(196),
    bump: bytes[198],
  };
}

function decodeLoyaltyRewardGate(data) {
  const bytes = Buffer.from(data);
  if (bytes.length !== 144) throw new Error(`LoyaltyRewardGate has unexpected length ${bytes.length}.`);
  assertDiscriminator(bytes, DISCRIMINATORS.loyaltyRewardGate, "LoyaltyRewardGate");
  return {
    reward: publicKey(bytes, 8),
    loyaltyConfig: publicKey(bytes, 40),
    authority: publicKey(bytes, 72),
    policyHash: bytes.subarray(104, 136).toString("hex"),
    policyEpoch: bytes.readUInt32LE(136),
    minimumScore: bytes.readUInt16LE(140),
    minimumTier: bytes[142],
    bump: bytes[143],
  };
}

function assertDevnetExplorer(url, label) {
  const parsed = new URL(url);
  if (parsed.hostname !== "explorer.solana.com" || parsed.searchParams.get("cluster") !== "devnet") {
    throw new Error(`${label} is not a Solana Explorer Devnet URL.`);
  }
}

function assertPda(actual, seeds, programId, label) {
  const [expected] = PublicKey.findProgramAddressSync(seeds, programId);
  if (!expected.equals(actual)) throw new Error(`${label} does not match its canonical PDA.`);
}

async function requiredAccount(connection, address, expectedOwner, label) {
  const account = await connection.getAccountInfo(address, "finalized");
  if (!account) throw new Error(`${label} is missing on Devnet.`);
  if (!account.owner.equals(expectedOwner)) throw new Error(`${label} has the wrong owning program.`);
  return account;
}

async function successfulTransaction(connection, transaction, label) {
  if (!transaction?.signature || !transaction?.explorerUrl) throw new Error(`${label} is absent from public evidence.`);
  assertDevnetExplorer(transaction.explorerUrl, label);
  const result = await connection.getSignatureStatus(transaction.signature, { searchTransactionHistory: true });
  if (!result.value || result.value.err !== null || !result.value.confirmationStatus) throw new Error(`${label} is not a confirmed successful Devnet transaction.`);
}

const deployment = readJson("deployments/devnet.json");
const evidence = readJson("evidence/devnet-addresses.json");
const links = readJson("evidence/transaction-links.json");
const demo = deployment.heartbeatDemo;

if (deployment.cluster !== "devnet" || deployment.status !== "deployed" || demo?.status !== "complete") {
  throw new Error("Heartbeat Devnet evidence is incomplete; run pnpm heartbeat:demo after a Devnet upgrade.");
}
if (JSON.stringify({ deployment, evidence, links }).toLowerCase().includes("mainnet")) {
  throw new Error("Public evidence contains a forbidden Mainnet reference.");
}
if (!deployment.rpcUrl?.includes("devnet")) throw new Error("The declared heartbeat RPC is not a Devnet endpoint.");

const builderloop = new PublicKey(deployment.programs?.builderloop?.address);
const cohortBuild = new PublicKey(deployment.programs?.cohortBuild?.address);
const rpc = new Connection(deployment.rpcUrl, "finalized");
if (await rpc.getGenesisHash() !== DEVNET_GENESIS_HASH) throw new Error("The heartbeat verification RPC is not Solana Devnet.");

for (const [name, programId] of [["BuilderLoop", builderloop], ["CohortBuild", cohortBuild]]) {
  const program = await rpc.getAccountInfo(programId, "finalized");
  if (!program?.executable || !program.owner.equals(UPGRADEABLE_LOADER)) throw new Error(`${name} is not an executable upgradeable Devnet program.`);
}

const addresses = Object.fromEntries(Object.entries({
  campaign: demo.campaign,
  loyaltyConfig: demo.loyaltyConfig,
  user: demo.user,
  loyaltyState: demo.loyaltyState,
  reward: demo.reward,
  loyaltyRewardGate: demo.loyaltyRewardGate,
  rewardVault: demo.rewardVault,
  mint: demo.mint,
  recipient: demo.recipient,
  claim: demo.claim,
}).map(([key, value]) => [key, new PublicKey(value)]));
const receiptAddresses = demo.activityReceipts.map((address) => new PublicKey(address));

assertPda(addresses.loyaltyConfig, [Buffer.from("loyalty_config"), addresses.campaign.toBuffer()], builderloop, "LoyaltyConfig");
assertPda(addresses.loyaltyState, [Buffer.from("loyalty_state"), addresses.loyaltyConfig.toBuffer(), addresses.user.toBuffer()], builderloop, "LoyaltyState");
assertPda(addresses.loyaltyRewardGate, [Buffer.from("loyalty_reward_gate"), addresses.reward.toBuffer()], builderloop, "LoyaltyRewardGate");
assertPda(addresses.claim, [Buffer.from("claim"), addresses.reward.toBuffer(), addresses.user.toBuffer()], builderloop, "Loyalty Claim");
assertPda(addresses.rewardVault, [Buffer.from("vault"), addresses.reward.toBuffer()], builderloop, "Loyalty reward vault");

const [campaignAccount, configAccount, stateAccount, gateAccount, rewardAccount, claimAccount, ...receiptAccounts] = await Promise.all([
  requiredAccount(rpc, addresses.campaign, builderloop, "Heartbeat campaign"),
  requiredAccount(rpc, addresses.loyaltyConfig, builderloop, "LoyaltyConfig"),
  requiredAccount(rpc, addresses.loyaltyState, builderloop, "LoyaltyState"),
  requiredAccount(rpc, addresses.loyaltyRewardGate, builderloop, "LoyaltyRewardGate"),
  requiredAccount(rpc, addresses.reward, builderloop, "Loyalty reward"),
  requiredAccount(rpc, addresses.claim, builderloop, "Loyalty claim"),
  ...receiptAddresses.map((address, index) => requiredAccount(rpc, address, builderloop, `ActivityReceipt ${index + 1}`)),
]);
void campaignAccount;
void rewardAccount;
void claimAccount;

const config = decodeLoyaltyConfig(configAccount.data);
const state = decodeLoyaltyState(stateAccount.data);
const gate = decodeLoyaltyRewardGate(gateAccount.data);
const receipts = receiptAccounts.map((account) => decodeActivityReceipt(account.data));
const policy = {
  builderloopProgramId: builderloop.toBase58(),
  campaign: config.campaign,
  campaignConfigHash: config.campaignConfigHash,
  authority: config.authority,
  verifier: config.verifier,
  verifierEpoch: config.verifierEpoch,
  heartbeatSeconds: config.heartbeatSeconds,
  minimumReturnInterval: config.minimumReturnInterval,
  activeCredit: config.activeCredit,
  streakBonus: config.streakBonus,
  streakBonusCap: config.streakBonusCap,
  decayPerMissedPeriod: config.decayPerMissedPeriod,
  bronzeThreshold: config.bronzeThreshold,
  silverThreshold: config.silverThreshold,
  goldThreshold: config.goldThreshold,
  platinumThreshold: config.platinumThreshold,
  policyEpoch: config.policyEpoch,
  activatedAt: config.activatedAt,
};
if (heartbeatConfigHash(policy) !== config.configHash) throw new Error("LoyaltyConfig hash does not match its deterministic policy bytes.");
if (config.campaign !== addresses.campaign.toBase58() || state.loyaltyConfig !== addresses.loyaltyConfig.toBase58() || state.campaign !== addresses.campaign.toBase58() || state.wallet !== addresses.user.toBase58()) {
  throw new Error("Loyalty account graph is inconsistent.");
}
if (state.policyEpoch !== config.policyEpoch || gate.loyaltyConfig !== addresses.loyaltyConfig.toBase58() || gate.reward !== addresses.reward.toBase58() || gate.policyHash !== config.configHash || gate.policyEpoch !== config.policyEpoch) {
  throw new Error("Loyalty policy snapshot or reward gate is inconsistent.");
}
if (config.heartbeatSeconds !== demo.timing.heartbeatSeconds || config.minimumReturnInterval !== demo.timing.minimumReturnInterval || config.activeCredit !== demo.policy.activeCredit || config.streakBonus !== demo.policy.streakBonus || config.streakBonusCap !== demo.policy.streakBonusCap || config.decayPerMissedPeriod !== demo.policy.decayPerMissedPeriod) {
  throw new Error("LoyaltyConfig does not match the declared public Devnet demo policy.");
}
if (gate.minimumScore !== demo.policy.rewardMinimumScore || gate.minimumTier !== demo.policy.rewardMinimumTier) throw new Error("Reward gate does not match the declared public threshold.");
if (state.scoreAtLastSettlement !== demo.policy.scoreAfterSecondActivity || state.streak !== demo.policy.streakAfterSecondActivity || state.totalCountedActivities !== 2) throw new Error("LoyaltyState does not match the documented two-return progression.");

for (const [index, receipt] of receipts.entries()) {
  if (receipt.loyaltyConfig !== addresses.loyaltyConfig.toBase58() || receipt.campaign !== addresses.campaign.toBase58() || receipt.wallet !== addresses.user.toBase58() || receipt.activityKind === 0 || receipt.verifierEpoch !== config.verifierEpoch || receipt.policyEpoch !== config.policyEpoch || receipt.issuedAt < config.activatedAt) {
    throw new Error(`ActivityReceipt ${index + 1} is not bound to the immutable Heartbeat policy.`);
  }
  assertPda(receiptAddresses[index], [Buffer.from("activity"), addresses.loyaltyConfig.toBuffer(), addresses.user.toBuffer(), receipt.activityIdHash], builderloop, `ActivityReceipt ${index + 1}`);
}
if (receipts[1].scoreAfter !== state.scoreAtLastSettlement || receipts[1].streakAfter !== state.streak || receipts[1].creditedAt !== state.lastMeaningfulActivityAt) throw new Error("The latest ActivityReceipt and LoyaltyState disagree.");

const nowSlot = await rpc.getSlot("finalized");
const now = await rpc.getBlockTime(nowSlot);
if (now === null) throw new Error("Devnet did not return a current block timestamp.");
const liveView = effectiveLoyalty({ scoreAtLastSettlement: state.scoreAtLastSettlement, lastMeaningfulActivityAt: state.lastMeaningfulActivityAt, streak: state.streak }, policy, now);
const observed = demo.lazyDecayObservation;
const observedView = effectiveLoyalty({ scoreAtLastSettlement: state.scoreAtLastSettlement, lastMeaningfulActivityAt: state.lastMeaningfulActivityAt, streak: state.streak }, policy, observed.observedAt);
if (observedView.elapsedPeriods !== observed.elapsedPeriods || observedView.missedPeriods !== observed.missedPeriods || observedView.effectiveScore !== observed.effectiveScore || observedView.effectiveScore >= state.scoreAtLastSettlement) {
  throw new Error("The documented lazy-decay observation does not match the deterministic score formula.");
}

const [vault, recipient] = await Promise.all([getAccount(rpc, addresses.rewardVault, "finalized"), getAccount(rpc, addresses.recipient, "finalized")]);
if (!vault.address.equals(addresses.rewardVault) || !vault.mint.equals(addresses.mint) || !vault.owner.equals(addresses.reward)) throw new Error("Loyalty reward vault has the wrong mint or authority.");
if (!recipient.mint.equals(addresses.mint) || !recipient.owner.equals(addresses.user) || recipient.amount === 0n) throw new Error("Loyalty reward recipient is not signer-owned or did not receive the fixed SPL reward.");
const mintAccount = await requiredAccount(rpc, addresses.mint, TOKEN_PROGRAM, "Loyalty reward mint");
void mintAccount;

for (const [name, transaction] of Object.entries(demo.transactions)) await successfulTransaction(rpc, transaction, `Heartbeat transaction ${name}`);
for (const [name, check] of Object.entries(demo.checks)) {
  if (!check?.rejected) throw new Error(`Expected rejection proof ${name} is missing.`);
}
for (const [name, entry] of Object.entries(evidence.heartbeat ?? {})) {
  if (!entry?.explorerUrl) throw new Error(`Public heartbeat address ${name} lacks an Explorer URL.`);
  assertDevnetExplorer(entry.explorerUrl, `Public heartbeat address ${name}`);
}

console.log(JSON.stringify({
  status: "verified",
  cluster: "devnet",
  programIds: { builderloop: builderloop.toBase58(), cohortBuild: cohortBuild.toBase58() },
  loyaltyConfig: addresses.loyaltyConfig.toBase58(),
  loyaltyState: addresses.loyaltyState.toBase58(),
  effectiveLoyalty: liveView,
  checkedTransactions: Object.keys(demo.transactions),
}, null, 2));
