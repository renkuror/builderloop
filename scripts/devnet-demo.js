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
const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const BUILDERLOOP = new PublicKey("3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2");
const COHORT_BUILD = new PublicKey("BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF");
const LAMPORTS_PER_SOL = 1_000_000_000;
const DEMO = Object.freeze({
  label: "DEMO CONFIGURATION — shortened real Solana Clock gates",
  periodSeconds: 2,
  minimumPeriodGap: 1,
  minimumElapsedSeconds: 2,
  moduleChallengeDelaySeconds: 1,
  totalPeriods: 250,
  rewardAmount: 1_000_000,
});

const sha = (...parts) => createHash("sha256").update(Buffer.concat(parts)).digest();
const le32 = (value) => { const out = Buffer.alloc(4); out.writeUInt32LE(value); return out; };
const le64 = (value) => { const out = Buffer.alloc(8); out.writeBigInt64LE(BigInt(value)); return out; };
const ule64 = (value) => { const out = Buffer.alloc(8); out.writeBigUInt64LE(BigInt(value)); return out; };
const explorerAddress = (address) => `https://explorer.solana.com/address/${address}?cluster=devnet`;
const explorerTransaction = (signature) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
  for (let attempt = 0; attempt < 45; attempt += 1) {
    if (await networkTime(connection) >= earliest) return;
    await pause(1_000);
  }
  throw new Error(`Timed out waiting for real Devnet Clock gate: ${description}`);
}

async function fundRole(connection, payer, recipient) {
  return sendAndConfirmTransaction(
    connection,
    new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipient, lamports: Math.floor(0.08 * LAMPORTS_PER_SOL) })),
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
  if (!account || !account.executable || !account.owner.equals(BPF_LOADER_UPGRADEABLE_PROGRAM_ID)) {
    throw new Error(`${name} is not an executable upgradeable program on Devnet.`);
  }
}

async function main() {
  const deployment = JSON.parse(readFileSync("deployments/devnet.json", "utf8"));
  const rpcUrl = process.env.BUILDERLOOP_DEVNET_RPC_URL ?? deployment.rpcUrl ?? DEFAULT_RPC;
  requireDevnetUrl(rpcUrl);
  const connection = new Connection(rpcUrl, "confirmed");
  await assertDevnet(connection);
  const payer = loadPayer(process.env.BUILDERLOOP_DEVNET_WALLET ?? DEFAULT_WALLET);
  await requireProgram(connection, BUILDERLOOP, "BuilderLoop");
  await requireProgram(connection, COHORT_BUILD, "CohortBuild");
  if (await connection.getBalance(payer.publicKey, "confirmed") < 500_000_000) {
    throw new Error("The dedicated Devnet payer needs at least 0.5 SOL for the demo lifecycle.");
  }

  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), { commitment: "confirmed", preflightCommitment: "confirmed" });
  anchor.setProvider(provider);
  const builder = new anchor.Program(JSON.parse(readFileSync("target/idl/builderloop.json", "utf8")), provider);
  const cohort = new anchor.Program(JSON.parse(readFileSync("target/idl/cohort_build.json", "utf8")), provider);
  if (!builder.programId.equals(BUILDERLOOP) || !cohort.programId.equals(COHORT_BUILD)) throw new Error("Local IDLs do not match the audited program identities.");

  const rewardAuthority = Keypair.generate();
  const user = Keypair.generate();
  const verifier = Keypair.generate();
  const rewardAuthorityFunding = await fundRole(connection, payer, rewardAuthority.publicKey);
  const userFunding = await fundRole(connection, payer, user.publicKey);
  const campaignId = randomPositiveU64();
  const challengeId = randomPositiveU64();
  const rewardId = randomPositiveU64();
  const startTs = (await networkTime(connection)) - 1;
  const endTs = startTs + DEMO.periodSeconds * DEMO.totalPeriods;
  const [sourceAuthority] = PublicKey.findProgramAddressSync([Buffer.from("builderloop_authority"), BUILDERLOOP.toBuffer()], COHORT_BUILD);
  const [campaign] = PublicKey.findProgramAddressSync([Buffer.from("campaign"), payer.publicKey.toBuffer(), ule64(campaignId)], BUILDERLOOP);
  const [progress] = PublicKey.findProgramAddressSync([Buffer.from("user"), campaign.toBuffer(), user.publicKey.toBuffer()], BUILDERLOOP);
  const campaignArgs = {
    campaignId: new anchor.BN(campaignId.toString()),
    verifier: verifier.publicKey,
    rewardAuthority: rewardAuthority.publicKey,
    startTs: new anchor.BN(startTs),
    endTs: new anchor.BN(endTs),
    periodSeconds: new anchor.BN(DEMO.periodSeconds),
    totalPeriods: DEMO.totalPeriods,
    minPeriodGap: DEMO.minimumPeriodGap,
    minElapsedSeconds: new anchor.BN(DEMO.minimumElapsedSeconds),
    moduleChallengeDelay: new anchor.BN(DEMO.moduleChallengeDelaySeconds),
    moduleNamespace: 1,
    canonicalizerVersion: 1,
    sourceProgram: COHORT_BUILD,
    sourceAuthority,
    challengeId: new anchor.BN(challengeId.toString()),
  };
  const campaignCreated = await builder.methods.createCampaign(campaignArgs).accounts({ authority: payer.publicKey, campaign, systemProgram: SystemProgram.programId }).rpc();
  const campaignFrozen = await builder.methods.freezeCampaign().accounts({ authority: payer.publicKey, campaign }).rpc();
  const campaignStarted = await builder.methods.startCampaign().accounts({ authority: payer.publicKey, campaign }).rpc();
  const userInitialized = await builder.methods.initUser().accounts({ wallet: user.publicKey, campaign, userProgress: progress, systemProgram: SystemProgram.programId }).signers([user]).rpc();

  const projectSeedHash = sha(Buffer.from("builderloop-devnet-demo-project"), randomBytes(32));
  const projectId = sha(Buffer.from("BUILDERLOOP_PROJECT_V1"), BUILDERLOOP.toBuffer(), campaign.toBuffer(), user.publicKey.toBuffer(), projectSeedHash);
  const eventIdHash = sha(Buffer.from("namespace:1:builderloop-devnet-demo-event"), randomBytes(32));
  const metadataHash = sha(Buffer.from("builderloop-devnet-demo-metadata"));
  const expiresAt = (await networkTime(connection)) + 180;
  const voucher = {
    verifierEpoch: 0,
    eventIdHash: [...eventIdHash],
    projectId: [...projectId],
    projectSeedHash: [...projectSeedHash],
    metadataHash: [...metadataHash],
    expiresAt: new anchor.BN(expiresAt),
  };
  const moduleMessage = Buffer.concat([
    Buffer.from("BUILDERLOOP_MODULE_V1"), BUILDERLOOP.toBuffer(), campaign.toBuffer(), user.publicKey.toBuffer(), le32(0),
    eventIdHash, projectId, projectSeedHash, metadataHash, le64(expiresAt),
  ]);
  const [moduleReceipt] = PublicKey.findProgramAddressSync([Buffer.from("module"), campaign.toBuffer(), eventIdHash], BUILDERLOOP);
  const ed25519 = Ed25519Program.createInstructionWithPrivateKey({ privateKey: verifier.secretKey, message: moduleMessage });
  const submitModule = await builder.methods.submitModuleAttestation(voucher).accounts({
    wallet: user.publicKey,
    campaign,
    userProgress: progress,
    moduleReceipt,
    instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    systemProgram: SystemProgram.programId,
  }).instruction();
  const moduleSubmitted = await provider.sendAndConfirm(new Transaction().add(ed25519, submitModule), [user]);
  const pendingReceipt = await builder.account.moduleReceipt.fetch(moduleReceipt);
  await waitForChainTime(connection, pendingReceipt.finalizeAfter.toNumber(), "ModuleReceipt finalization");
  const moduleFinalized = await builder.methods.finalizeModule().accounts({ wallet: user.publicKey, campaign, userProgress: progress, moduleReceipt }).signers([user]).rpc();

  const [challenge] = PublicKey.findProgramAddressSync([Buffer.from("challenge"), ule64(challengeId)], COHORT_BUILD);
  const challengeCreated = await cohort.methods.createChallenge(new anchor.BN(challengeId.toString())).accounts({ authority: payer.publicKey, challenge, systemProgram: SystemProgram.programId }).rpc();
  const [submission] = PublicKey.findProgramAddressSync([Buffer.from("submission"), challenge.toBuffer(), user.publicKey.toBuffer()], COHORT_BUILD);
  const submissionCreated = await cohort.methods.createBuildSubmission([...projectId]).accounts({ user: user.publicKey, challenge, submission, systemProgram: SystemProgram.programId }).signers([user]).rpc();
  const finalizedProgress = await builder.account.userProgress.fetch(progress);
  const earliestShip = finalizedProgress.moduleFinalizedAt.toNumber() + DEMO.minimumElapsedSeconds;
  const requiredPeriod = finalizedProgress.modulePeriod + DEMO.minimumPeriodGap;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const now = await networkTime(connection);
    const period = Math.floor((now - startTs) / DEMO.periodSeconds);
    if (now >= earliestShip && period >= requiredPeriod) break;
    if (attempt === 44) throw new Error("Timed out waiting for shortened real Solana Clock Ship gates.");
    await pause(1_000);
  }
  const [completion] = PublicKey.findProgramAddressSync([Buffer.from("completion"), ule64(challengeId), user.publicKey.toBuffer()], COHORT_BUILD);
  const artifactHash = sha(Buffer.from("builderloop-devnet-demo-artifact"), randomBytes(32));
  const nativeShip = await cohort.methods.completeBuild([...artifactHash]).accounts({
    user: user.publicKey,
    challenge,
    submission,
    completion,
    campaign,
    userProgress: progress,
    sourceAuthority,
    builderloopProgram: BUILDERLOOP,
    systemProgram: SystemProgram.programId,
  }).signers([user]).rpc();

  const mint = await createMint(connection, rewardAuthority, rewardAuthority.publicKey, null, 6);
  const source = await createAccount(connection, rewardAuthority, mint, rewardAuthority.publicKey);
  const recipient = await createAccount(connection, user, mint, user.publicKey);
  await mintTo(connection, rewardAuthority, mint, source, rewardAuthority, DEMO.rewardAmount);
  const [reward] = PublicKey.findProgramAddressSync([Buffer.from("reward"), campaign.toBuffer(), rewardAuthority.publicKey.toBuffer(), ule64(rewardId)], BUILDERLOOP);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), reward.toBuffer()], BUILDERLOOP);
  const now = await networkTime(connection);
  const rewardCreated = await builder.methods.createReward({
    rewardId: new anchor.BN(rewardId.toString()),
    amountPerClaim: new anchor.BN(DEMO.rewardAmount),
    maxClaims: 1,
    startsAt: new anchor.BN(now - 1),
    endsAt: new anchor.BN(Math.min(endTs - 1, now + 180)),
  }).accounts({ rewardAuthority: rewardAuthority.publicKey, campaign, mint, reward, vault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([rewardAuthority]).rpc();
  const rewardFunded = await builder.methods.fundReward(new anchor.BN(DEMO.rewardAmount)).accounts({ rewardAuthority: rewardAuthority.publicKey, reward, mint, source, vault, tokenProgram: TOKEN_PROGRAM_ID }).signers([rewardAuthority]).rpc();
  const rewardActivated = await builder.methods.activateReward().accounts({ rewardAuthority: rewardAuthority.publicKey, reward, vault }).signers([rewardAuthority]).rpc();
  const [claim] = PublicKey.findProgramAddressSync([Buffer.from("claim"), reward.toBuffer(), user.publicKey.toBuffer()], BUILDERLOOP);
  const rewardClaimed = await builder.methods.claimReward().accounts({ wallet: user.publicKey, campaign, userProgress: progress, reward, mint, vault, recipient, claim, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).signers([user]).rpc();

  const [campaignAccount, progressAccount, receiptAccount, completionAccount, rewardAccount, claimAccount, recipientAccount] = await Promise.all([
    connection.getAccountInfo(campaign, "confirmed"),
    connection.getAccountInfo(progress, "confirmed"),
    connection.getAccountInfo(moduleReceipt, "confirmed"),
    connection.getAccountInfo(completion, "confirmed"),
    connection.getAccountInfo(reward, "confirmed"),
    connection.getAccountInfo(claim, "confirmed"),
    getAccount(connection, recipient, "confirmed"),
  ]);
  if (![campaignAccount, progressAccount, receiptAccount, rewardAccount, claimAccount].every(Boolean)) throw new Error("Expected BuilderLoop Devnet accounts were not found after the demo.");
  if (!completionAccount || !completionAccount.owner.equals(COHORT_BUILD)) throw new Error("CohortBuild Completion was not found on Devnet.");
  if (!campaignAccount.owner.equals(BUILDERLOOP) || !progressAccount.owner.equals(BUILDERLOOP) || !receiptAccount.owner.equals(BUILDERLOOP) || !rewardAccount.owner.equals(BUILDERLOOP) || !claimAccount.owner.equals(BUILDERLOOP)) throw new Error("A required BuilderLoop account has the wrong owner.");
  const finalProgress = await builder.account.userProgress.fetch(progress);
  const finalReward = await builder.account.reward.fetch(reward);
  if (!Object.hasOwn(finalProgress.stage, "shipped") || finalReward.claimedCount !== 1 || recipientAccount.amount !== BigInt(DEMO.rewardAmount)) {
    throw new Error("Devnet account refetch did not confirm Shipped state and fixed reward settlement.");
  }

  const transactions = {
    rewardAuthorityFunding: publicTransaction(rewardAuthorityFunding, "Fund DEMO reward authority"),
    userFunding: publicTransaction(userFunding, "Fund DEMO participant"),
    campaignCreated: publicTransaction(campaignCreated, "Create Campaign"),
    campaignFrozen: publicTransaction(campaignFrozen, "Freeze Campaign"),
    campaignStarted: publicTransaction(campaignStarted, "Start Campaign"),
    userInitialized: publicTransaction(userInitialized, "Initialize UserProgress"),
    moduleSubmitted: publicTransaction(moduleSubmitted, "Submit pending ModuleReceipt"),
    moduleFinalized: publicTransaction(moduleFinalized, "Finalize Module"),
    challengeCreated: publicTransaction(challengeCreated, "Create CohortBuild Challenge"),
    submissionCreated: publicTransaction(submissionCreated, "Create BuildSubmission"),
    nativeCpiShip: publicTransaction(nativeShip, "CohortBuild native CPI to BuilderLoop Shipped"),
    rewardCreated: publicTransaction(rewardCreated, "Create fixed SPL Reward"),
    rewardFunded: publicTransaction(rewardFunded, "Fund fixed SPL Reward"),
    rewardActivated: publicTransaction(rewardActivated, "Activate fixed SPL Reward"),
    rewardClaimed: publicTransaction(rewardClaimed, "Claim fixed SPL Reward"),
  };
  const addresses = {
    campaign: publicAddress(campaign),
    user: publicAddress(user.publicKey),
    userProgress: publicAddress(progress),
    moduleReceipt: publicAddress(moduleReceipt),
    challenge: publicAddress(challenge),
    buildSubmission: publicAddress(submission),
    completion: publicAddress(completion),
    sourceAuthority: publicAddress(sourceAuthority),
    reward: publicAddress(reward),
    rewardVault: publicAddress(vault),
    mint: publicAddress(mint),
    recipient: publicAddress(recipient),
    claim: publicAddress(claim),
  };
  const demo = {
    status: "complete",
    label: DEMO.label,
    campaign: campaign.toBase58(),
    reward: reward.toBase58(),
    userProgress: progress.toBase58(),
    claim: claim.toBase58(),
    mint: mint.toBase58(),
    recipient: recipient.toBase58(),
    timing: {
      periodSeconds: DEMO.periodSeconds,
      minimumPeriodGap: DEMO.minimumPeriodGap,
      minimumElapsedSeconds: DEMO.minimumElapsedSeconds,
      moduleChallengeDelaySeconds: DEMO.moduleChallengeDelaySeconds,
    },
    transactions: {
      moduleFinalization: transactions.moduleFinalized,
      nativeCpiShip: transactions.nativeCpiShip,
      rewardClaimed: transactions.rewardClaimed,
    },
  };
  const nextDeployment = { ...deployment, status: "deployed", cluster: "devnet", rpcUrl, demo };
  const nextAddresses = { schemaVersion: 1, status: "deployed", cluster: "devnet", programs: nextDeployment.programs, addresses };
  const nextTransactions = {
    schemaVersion: 1,
    status: "deployed",
    cluster: "devnet",
    transactions: {
      builderloopDeployment: publicTransaction(nextDeployment.programs.builderloop.deploymentSignature, "Deploy BuilderLoop"),
      cohortBuildDeployment: publicTransaction(nextDeployment.programs.cohortBuild.deploymentSignature, "Deploy CohortBuild"),
      moduleFinalization: transactions.moduleFinalized,
      ...transactions,
    },
  };
  mkdirSync("deployments", { recursive: true });
  mkdirSync("evidence", { recursive: true });
  writeFileSync("deployments/devnet.json", `${JSON.stringify(nextDeployment, null, 2)}\n`);
  writeFileSync("evidence/devnet-addresses.json", `${JSON.stringify(nextAddresses, null, 2)}\n`);
  writeFileSync("evidence/transaction-links.json", `${JSON.stringify(nextTransactions, null, 2)}\n`);
  console.log(JSON.stringify({ status: "verified", cluster: "devnet", programs: nextDeployment.programs, demo, transactions }, null, 2));
}

await main();
