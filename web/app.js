import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Buffer } from "buffer";

const PROGRAM_ID = new PublicKey("3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2");
const stages = ["Initialized", "ModulePending", "ModuleFinalized", "Shipped"];
const campaignStatuses = ["Draft", "Frozen", "Active", "Finalized"];
const rewardStatuses = ["Draft", "Funded", "Active", "Paused", "Ended", "Closed"];
const discriminators = {
  campaign: [37, 60, 103, 198, 105, 149, 26, 142],
  progress: [195, 16, 25, 215, 192, 49, 107, 204],
  reward: [174, 129, 42, 212, 190, 18, 45, 34],
};
const $ = (selector) => document.querySelector(selector);
const hex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const keyAt = (data, offset) => new PublicKey(data.subarray(offset, offset + 32));
const i64 = (view, offset) => Number(view.getBigInt64(offset, true));
const u64 = (view, offset) => view.getBigUint64(offset, true);
const setGate = (selector, done, text) => {
  const element = $(selector);
  element.dataset.state = done ? "done" : "locked";
  element.textContent = text;
};

let wallet;
let connection;
let campaign;
let progress;
let reward;

$("#connectButton").addEventListener("click", async () => {
  try {
    if (!window.solana?.connect) throw new Error("Install a Solana wallet exposing window.solana");
    const response = await window.solana.connect();
    wallet = response.publicKey;
    $("#walletOutput").textContent = wallet.toBase58();
    await loadState();
  } catch (error) {
    $("#walletOutput").textContent = error.message;
  }
});

$("#loadButton").addEventListener("click", loadState);
$("#claimButton").addEventListener("click", claimReward);

async function loadState() {
  try {
    connection = new Connection($("#rpcUrl").value.trim(), "confirmed");
    const campaignKey = new PublicKey($("#campaignAddress").value.trim());
    const account = await connection.getAccountInfo(campaignKey);
    if (!account || !account.owner.equals(PROGRAM_ID)) throw new Error("Campaign account is missing or has the wrong owner");
    campaign = decodeCampaign(account.data, campaignKey);
    renderCampaign(campaign);
    if (wallet) await loadProgress(campaignKey);
    const rewardText = $("#rewardAddress").value.trim();
    if (rewardText) await loadReward(new PublicKey(rewardText));
    $("#loadOutput").textContent = `Loaded at slot ${await connection.getSlot("confirmed")}`;
  } catch (error) {
    $("#loadOutput").textContent = error.message;
    $("#claimButton").disabled = true;
  }
}

function decodeCampaign(data, address) {
  if (data.length !== 270 || !discriminators.campaign.every((byte, index) => data[index] === byte)) throw new Error("Campaign account has an invalid discriminator or layout");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    address, authority: keyAt(data, 8), campaignId: u64(view, 40), status: data[48], verifier: keyAt(data, 49),
    verifierEpoch: view.getUint32(81, true), verifierActive: Boolean(data[85]), rewardAuthority: keyAt(data, 86),
    startTs: i64(view, 118), endTs: i64(view, 126), periodSeconds: i64(view, 134), totalPeriods: data[142],
    minPeriodGap: data[143], minElapsedSeconds: i64(view, 144), sourceProgram: keyAt(data, 164),
    sourceAuthority: keyAt(data, 196), challengeId: u64(view, 228), paused: Boolean(data[236]), configHash: data.subarray(237, 269),
  };
}

function renderCampaign(value) {
  $("#campaignAuthority").textContent = `${value.authority} (test campaign authority unless externally evidenced)`;
  $("#rewardAuthority").textContent = `${value.rewardAuthority} (separate test reward authority)`;
  $("#verifier").textContent = `${value.verifier} · epoch ${value.verifierEpoch} · ${value.verifierActive ? "active" : "deactivated"}`;
  $("#sourceProgram").textContent = `${value.sourceProgram} · authority ${value.sourceAuthority} · challenge ${value.challengeId}`;
  $("#campaignStatus").textContent = `${campaignStatuses[value.status] ?? "Unknown"}${value.paused ? " · actions paused" : ""}`;
  $("#campaignWindow").textContent = `${new Date(value.startTs * 1000).toISOString()} → ${new Date(value.endTs * 1000).toISOString()}`;
  $("#campaignGap").textContent = `${value.minElapsedSeconds}s and ${value.minPeriodGap} period(s); period length ${value.periodSeconds}s`;
  $("#configHash").textContent = hex(value.configHash);
}

async function loadProgress(campaignKey) {
  const [progressKey] = PublicKey.findProgramAddressSync([Buffer.from("user"), campaignKey.toBuffer(), wallet.toBuffer()], PROGRAM_ID);
  const account = await connection.getAccountInfo(progressKey);
  if (!account) {
    progress = undefined;
    $("#userStage").textContent = `No UserProgress at ${progressKey}`;
    $("#lockReason").textContent = "Join/init_user is required.";
    return;
  }
  if (!account.owner.equals(PROGRAM_ID) || account.data.length !== 220 || !discriminators.progress.every((byte, index) => account.data[index] === byte)) throw new Error("UserProgress has the wrong owner, discriminator, or layout");
  const data = account.data;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  progress = { address: progressKey, stage: data[72], projectId: data.subarray(73, 105), moduleFinalizedAt: i64(view, 169), modulePeriod: data[177], artifactHash: data.subarray(178, 210) };
  renderProgress(progress);
}

function renderProgress(value) {
  const now = Math.floor(Date.now() / 1000);
  const currentPeriod = now >= campaign.startTs && now < campaign.endTs ? Math.floor((now - campaign.startTs) / campaign.periodSeconds) : -1;
  const earliest = value.moduleFinalizedAt + campaign.minElapsedSeconds;
  const requiredPeriod = value.modulePeriod + campaign.minPeriodGap;
  const moduleDone = value.stage >= 2;
  const elapsedDone = moduleDone && now >= earliest;
  const periodDone = moduleDone && currentPeriod >= requiredPeriod;
  const shipped = value.stage === 3;
  setGate("#moduleGate", moduleDone, moduleDone ? "Module finalized" : value.stage === 1 ? "Module receipt pending" : "Module not finalized");
  setGate("#elapsedGate", elapsedDone, elapsedDone ? "Elapsed-time gate satisfied" : `Eligible after ${new Date(earliest * 1000).toISOString()}`);
  setGate("#periodGate", periodDone, periodDone ? "Period gate satisfied" : `Requires period ${requiredPeriod}; current period ${currentPeriod}`);
  setGate("#shipGate", shipped, shipped ? "Native Ship recorded" : "Native Ship not recorded");
  $("#userStage").textContent = stages[value.stage] ?? "Unknown";
  $("#projectId").textContent = hex(value.projectId);
  $("#artifactHash").textContent = hex(value.artifactHash);
  $("#lockReason").textContent = shipped ? "Eligible to claim an active funded reward." : !moduleDone ? "A finalized Module is required." : !elapsedDone ? `Elapsed-time lock until ${new Date(earliest * 1000).toISOString()}.` : !periodDone ? `Period lock: ${currentPeriod}/${requiredPeriod}.` : "Complete the same-project native CohortBuild Ship.";
}

async function loadReward(address) {
  const account = await connection.getAccountInfo(address);
  if (!account || !account.owner.equals(PROGRAM_ID) || account.data.length !== 211 || !discriminators.reward.every((byte, index) => account.data[index] === byte)) throw new Error("Reward account is missing or invalid");
  const data = account.data;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  reward = { address, campaign: keyAt(data, 8), authority: keyAt(data, 40), rewardId: u64(view, 72), configHash: data.subarray(80, 112), mint: keyAt(data, 112), vault: keyAt(data, 144), amount: u64(view, 176), maxClaims: view.getUint32(184, true), claimed: view.getUint32(188, true), startsAt: i64(view, 192), endsAt: i64(view, 200), status: data[208] };
  $("#rewardRole").textContent = `${reward.authority} (separate test reward authority; sponsor independence not asserted)`;
  $("#rewardConfigHash").textContent = hex(reward.configHash);
  $("#rewardMint").textContent = reward.mint.toBase58();
  $("#rewardAmount").textContent = `${reward.amount} base units fixed on-chain`;
  $("#rewardInventory").textContent = `${reward.maxClaims - reward.claimed}/${reward.maxClaims} claims remaining`;
  $("#rewardWindow").textContent = `${new Date(reward.startsAt * 1000).toISOString()} → ${new Date(reward.endsAt * 1000).toISOString()}`;
  $("#rewardStatus").textContent = `${rewardStatuses[reward.status] ?? "Unknown"} · local test payout only`;
  $("#claimButton").disabled = !(wallet && progress?.stage === 3 && reward.status === 2 && reward.campaign.equals(campaign.address));
}

async function claimReward() {
  try {
    if (!wallet || !reward || !progress || !campaign) throw new Error("Load connected eligible state first");
    const recipient = new PublicKey($("#recipientAddress").value.trim());
    const [claim] = PublicKey.findProgramAddressSync([Buffer.from("claim"), reward.address.toBuffer(), wallet.toBuffer()], PROGRAM_ID);
    const discriminator = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("global:claim_reward")));
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      data: Buffer.from(discriminator.subarray(0, 8)),
      keys: [
        { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: campaign.address, isSigner: false, isWritable: false },
        { pubkey: progress.address, isSigner: false, isWritable: false }, { pubkey: reward.address, isSigner: false, isWritable: true },
        { pubkey: reward.mint, isSigner: false, isWritable: false }, { pubkey: reward.vault, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true }, { pubkey: claim, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
    });
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signed = await window.solana.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, "confirmed");
    $("#claimOutput").textContent = `Confirmed local transaction ${signature}`;
    await loadState();
  } catch (error) {
    $("#claimOutput").textContent = error.message;
  }
}
