#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as anchor from "@coral-xyz/anchor";
import { Ed25519Program, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { attestationBytes, attestationHash, configHash, projectId } from "../src/protocol.js";
import { campaignFixture, hashFixture, keys } from "../src/fixtures.js";

const command = process.argv[2];
const argument = process.argv[3];
const BUILDERLOOP = new PublicKey("3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2");

if (command === "campaign-hash") {
  const config = argument ? json(argument) : campaignFixture();
  console.log(configHash(config));
} else if (command === "issue-module") {
  issueModule(argument, process.argv[4]);
} else if (command === "inspect-module") {
  const payload = json(required(argument, "attestation JSON"));
  console.log(JSON.stringify({ bytesHex: attestationBytes(payload).toString("hex"), attestationHash: attestationHash(payload), projectId: payload.projectId }, null, 2));
} else if (command === "campaign-create") {
  await campaignCreate(json(required(argument, "campaign JSON")));
} else if (["campaign-freeze", "campaign-start", "campaign-pause", "campaign-resume", "campaign-finalize", "verifier-deactivate"].includes(command)) {
  await campaignAction(command, required(argument, "campaign PDA"));
} else if (command === "module-cancel") {
  await moduleCancel(json(required(argument, "module account JSON")));
} else if (command === "reward-create") {
  await rewardCreate(json(required(argument, "reward JSON")));
} else if (command === "reward-fund") {
  await rewardFund(json(required(argument, "reward funding JSON")));
} else if (command === "reward-activate") {
  await rewardActivate(json(required(argument, "reward account JSON")));
} else if (command === "export-evidence") {
  const result = spawnSync(process.execPath, ["scripts/export-evidence.js"], { stdio: "inherit" });
  process.exit(result.status ?? 1);
} else {
  console.error("Usage: builderloop <campaign-hash|issue-module|inspect-module|campaign-create|campaign-freeze|campaign-start|campaign-pause|campaign-resume|campaign-finalize|verifier-deactivate|module-cancel|reward-create|reward-fund|reward-activate|export-evidence> [JSON-or-address] [verifier-keypair]");
  process.exit(1);
}

function issueModule(inputPath, verifierPath) {
  if (!inputPath) {
    const seed = hashFixture("project-seed");
    const payload = { builderloopProgramId: keys.program, campaign: keys.authority, user: keys.user, verifierEpoch: campaignFixture().verifierEpoch, eventIdHash: hashFixture("event-1"), projectId: projectId({ programId: keys.program, campaign: keys.authority, user: keys.user, projectSeedHash: seed }), projectSeedHash: seed, metadataHash: hashFixture("metadata"), expiresAt: 10_000 };
    console.log(JSON.stringify({ ...payload, attestationHash: attestationHash(payload), signed: false, fixtureOnly: true }, null, 2));
    return;
  }
  const payload = json(inputPath);
  const message = attestationBytes(payload);
  if (!verifierPath) throw new Error("issue-module requires an ephemeral verifier keypair path");
  const verifier = Keypair.fromSecretKey(Uint8Array.from(json(verifierPath)));
  const instruction = Ed25519Program.createInstructionWithPrivateKey({ privateKey: verifier.secretKey, message });
  console.log(JSON.stringify({ payload, verifier: verifier.publicKey, bytesHex: message.toString("hex"), attestationHash: attestationHash(payload), ed25519InstructionBase64: Buffer.from(instruction.data).toString("base64") }, null, 2));
}

function client() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const idl = JSON.parse(readFileSync("target/idl/builderloop.json", "utf8"));
  return { provider, program: new anchor.Program(idl, provider) };
}

async function campaignCreate(config) {
  const { provider, program } = client();
  const authority = provider.wallet.publicKey;
  const id = new anchor.BN(config.campaignId);
  const [campaign] = PublicKey.findProgramAddressSync([Buffer.from("campaign"), authority.toBuffer(), id.toArrayLike(Buffer, "le", 8)], BUILDERLOOP);
  const args = { campaignId: id, verifier: key(config.verifier), rewardAuthority: key(config.rewardAuthority), startTs: bn(config.startTs), endTs: bn(config.endTs), periodSeconds: bn(config.periodSeconds), totalPeriods: config.totalPeriods, minPeriodGap: config.minPeriodGap, minElapsedSeconds: bn(config.minElapsedSeconds), moduleChallengeDelay: bn(config.moduleChallengeDelay), moduleNamespace: config.moduleNamespace, canonicalizerVersion: config.canonicalizerVersion, sourceProgram: key(config.sourceProgram), sourceAuthority: key(config.sourceAuthority), challengeId: bn(config.challengeId) };
  const signature = await program.methods.createCampaign(args).accounts({ authority, campaign, systemProgram: SystemProgram.programId }).rpc();
  output(signature, { campaign });
}

async function campaignAction(name, address) {
  const { provider, program } = client();
  const methods = { "campaign-freeze": "freezeCampaign", "campaign-start": "startCampaign", "campaign-pause": "pauseActions", "campaign-resume": "resumeActions", "campaign-finalize": "finalizeCampaign", "verifier-deactivate": "deactivateVerifier" };
  const campaign = key(address);
  const signature = await program.methods[methods[name]]().accounts({ authority: provider.wallet.publicKey, campaign }).rpc();
  output(signature, { campaign });
}

async function moduleCancel(config) {
  const { provider, program } = client();
  const signature = await program.methods.cancelPendingModule().accounts({ wallet: provider.wallet.publicKey, campaign: key(config.campaign), userProgress: key(config.userProgress), moduleReceipt: key(config.moduleReceipt) }).rpc();
  output(signature);
}

async function rewardCreate(config) {
  const { provider, program } = client();
  const authority = provider.wallet.publicKey;
  const campaign = key(config.campaign);
  const rewardId = bn(config.rewardId);
  const [reward] = PublicKey.findProgramAddressSync([Buffer.from("reward"), campaign.toBuffer(), authority.toBuffer(), rewardId.toArrayLike(Buffer, "le", 8)], BUILDERLOOP);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), reward.toBuffer()], BUILDERLOOP);
  const args = { rewardId, amountPerClaim: bn(config.amountPerClaim), maxClaims: config.maxClaims, startsAt: bn(config.startsAt), endsAt: bn(config.endsAt) };
  const signature = await program.methods.createReward(args).accounts({ rewardAuthority: authority, campaign, mint: key(config.mint), reward, vault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).rpc();
  output(signature, { reward, vault });
}

async function rewardFund(config) {
  const { provider, program } = client();
  const signature = await program.methods.fundReward(bn(config.amount)).accounts({ rewardAuthority: provider.wallet.publicKey, reward: key(config.reward), mint: key(config.mint), source: key(config.source), vault: key(config.vault), tokenProgram: TOKEN_PROGRAM_ID }).rpc();
  output(signature);
}

async function rewardActivate(config) {
  const { provider, program } = client();
  const signature = await program.methods.activateReward().accounts({ rewardAuthority: provider.wallet.publicKey, reward: key(config.reward), vault: key(config.vault) }).rpc();
  output(signature);
}

function json(path) { return JSON.parse(readFileSync(path, "utf8")); }
function key(value) { return new PublicKey(value); }
function bn(value) { return new anchor.BN(String(value)); }
function required(value, label) { if (!value) throw new Error(`missing ${label}`); return value; }
function output(signature, addresses = {}) { console.log(JSON.stringify({ cluster: "localnet", signature, ...Object.fromEntries(Object.entries(addresses).map(([name, value]) => [name, value.toBase58()])) }, null, 2)); }
