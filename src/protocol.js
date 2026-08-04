import { CampaignStatus, DOMAINS, ReceiptStatus, RewardStatus, UserStage } from "./constants.js";
import { assertHash, assertPubkey, canonicalJson, hashObject } from "./crypto.js";

const CONFIG_FIELDS = [
  "authority",
  "campaignId",
  "verifier",
  "verifierEpoch",
  "verifierActive",
  "rewardAuthority",
  "startTs",
  "endTs",
  "periodSeconds",
  "totalPeriods",
  "minPeriodGap",
  "minElapsedSeconds",
  "moduleChallengeDelay",
  "moduleNamespace",
  "canonicalizerVersion",
  "sourceProgram",
  "sourceAuthority",
  "challengeId",
  "actionsPaused"
];

export function configPayload(config) {
  return Object.fromEntries(CONFIG_FIELDS.map((field) => [field, config[field]]));
}

export function configHash(config) {
  validateCampaignConfig(config);
  return hashObject(DOMAINS.CONFIG, configPayload(config));
}

export function projectId({ programId, campaign, user, projectSeedHash }) {
  assertPubkey(programId, "programId");
  assertPubkey(campaign, "campaign");
  assertPubkey(user, "user");
  assertHash(projectSeedHash, "projectSeedHash");
  return hashObject(DOMAINS.PROJECT, { programId, campaign, user, projectSeedHash });
}

export function attestationBytes(payload) {
  const required = [
    "builderloopProgramId",
    "campaign",
    "user",
    "verifierEpoch",
    "eventIdHash",
    "projectId",
    "projectSeedHash",
    "metadataHash",
    "expiresAt"
  ];
  for (const key of required) {
    if (payload[key] === undefined) throw new Error(`attestation missing ${key}`);
  }
  return `${DOMAINS.MODULE}\n${canonicalJson(payload)}`;
}

export function attestationHash(payload) {
  return hashObject(DOMAINS.MODULE, payload);
}

export function periodFor(config, timestamp) {
  if (!Number.isSafeInteger(timestamp)) throw new Error("timestamp must be a safe integer");
  validateCampaignConfig(config);
  if (timestamp < config.startTs || timestamp > config.endTs) throw new Error("timestamp outside campaign window");
  const elapsed = timestamp - config.startTs;
  if (!Number.isSafeInteger(elapsed) || elapsed < 0) throw new Error("invalid elapsed subtraction");
  const period = Math.floor(elapsed / config.periodSeconds);
  if (period < 0 || period >= config.totalPeriods) throw new Error("period outside range");
  return period;
}

export function validateCampaignConfig(config) {
  assertPubkey(config.authority, "authority");
  assertPubkey(config.verifier, "verifier");
  assertPubkey(config.rewardAuthority, "rewardAuthority");
  assertPubkey(config.sourceProgram, "sourceProgram");
  assertPubkey(config.sourceAuthority, "sourceAuthority");
  for (const key of ["campaignId", "verifierEpoch", "challengeId"]) {
    if (!Number.isSafeInteger(config[key]) || config[key] < 0) throw new Error(`${key} must be a non-negative safe integer`);
  }
  for (const key of ["startTs", "endTs", "periodSeconds", "minElapsedSeconds", "moduleChallengeDelay"]) {
    if (!Number.isSafeInteger(config[key])) throw new Error(`${key} must be a safe integer`);
  }
  if (config.startTs >= config.endTs) throw new Error("campaign start must precede end");
  if (config.periodSeconds <= 0) throw new Error("periodSeconds must be positive");
  if (!Number.isSafeInteger((config.endTs - config.startTs) / config.periodSeconds)) {
    throw new Error("campaign duration must divide into periods");
  }
  if (!Number.isInteger(config.totalPeriods) || config.totalPeriods <= 0 || config.totalPeriods > 255) throw new Error("invalid totalPeriods");
  if (!Number.isInteger(config.minPeriodGap) || config.minPeriodGap < 0 || config.minPeriodGap >= config.totalPeriods) throw new Error("invalid minPeriodGap");
  if (config.minElapsedSeconds < 0 || config.moduleChallengeDelay < 0) throw new Error("negative timing gate");
  if (!Number.isInteger(config.moduleNamespace) || !Number.isInteger(config.canonicalizerVersion)) throw new Error("namespace/version must be integers");
  return true;
}

export function createCampaign(config) {
  validateCampaignConfig(config);
  return { ...config, status: CampaignStatus.Draft, configHash: null };
}

export function freezeCampaign(campaign, signer) {
  requireAuthority(campaign, signer);
  if (campaign.status !== CampaignStatus.Draft) throw new Error("campaign must be Draft");
  return { ...campaign, status: CampaignStatus.Frozen, configHash: configHash(campaign) };
}

export function startCampaign(campaign, signer) {
  requireAuthority(campaign, signer);
  if (campaign.status !== CampaignStatus.Frozen) throw new Error("campaign must be Frozen");
  return { ...campaign, status: CampaignStatus.Active };
}

export function deactivateVerifier(campaign, signer) {
  requireAuthority(campaign, signer);
  if (![CampaignStatus.Frozen, CampaignStatus.Active].includes(campaign.status)) throw new Error("invalid campaign status");
  return { ...campaign, verifierActive: false, verifierEpoch: campaign.verifierEpoch + 1 };
}

export function initUser(campaign, wallet, signer) {
  requireCampaignActive(campaign);
  if (wallet !== signer) throw new Error("wallet signer required");
  return { campaignHash: campaign.configHash, wallet, stage: UserStage.Initialized };
}

export function submitModule(campaign, user, voucher, now) {
  requireCampaignActive(campaign);
  if (!campaign.verifierActive) throw new Error("verifier inactive");
  if (voucher.verifierEpoch !== campaign.verifierEpoch) throw new Error("stale verifier epoch");
  if (voucher.user !== user.wallet) throw new Error("voucher user mismatch");
  if (voucher.campaignConfigHash !== campaign.configHash) throw new Error("voucher campaign mismatch");
  if (voucher.expiresAt < now) throw new Error("voucher expired");
  assertHash(voucher.eventIdHash, "eventIdHash");
  assertHash(voucher.projectId, "projectId");
  assertHash(voucher.projectSeedHash, "projectSeedHash");
  assertHash(voucher.metadataHash, "metadataHash");
  if (user.stage !== UserStage.Initialized) throw new Error("user must be initialized");
  const receipt = {
    campaignHash: campaign.configHash,
    user: user.wallet,
    eventIdHash: voucher.eventIdHash,
    projectId: voucher.projectId,
    projectSeedHash: voucher.projectSeedHash,
    metadataHash: voucher.metadataHash,
    verifierEpoch: voucher.verifierEpoch,
    status: ReceiptStatus.Pending,
    submittedAt: now,
    finalizeAfter: now + campaign.moduleChallengeDelay
  };
  return [{ ...user, stage: UserStage.ModulePending }, receipt];
}

export function finalizeModule(campaign, user, receipt, now) {
  requireCampaignActive(campaign);
  if (user.stage !== UserStage.ModulePending) throw new Error("pending module required");
  if (receipt.status !== ReceiptStatus.Pending) throw new Error("receipt must be pending");
  if (receipt.verifierEpoch !== campaign.verifierEpoch || !campaign.verifierActive) throw new Error("stale pending receipt");
  if (now < receipt.finalizeAfter) throw new Error("challenge delay not elapsed");
  const modulePeriod = periodFor(campaign, now);
  return [
    {
      ...user,
      stage: UserStage.ModuleFinalized,
      projectId: receipt.projectId,
      projectSeedHash: receipt.projectSeedHash,
      moduleEventHash: receipt.eventIdHash,
      moduleFinalizedAt: now,
      modulePeriod
    },
    { ...receipt, status: ReceiptStatus.Finalized }
  ];
}

export function recordNativeShip(campaign, user, completion, signer, now) {
  requireCampaignActive(campaign);
  if (signer !== user.wallet) throw new Error("user signs the Ship transaction");
  if (user.stage !== UserStage.ModuleFinalized) throw new Error("module must be finalized before Ship");
  if (completion.owner !== campaign.sourceProgram) throw new Error("wrong source owner/program");
  if (completion.authority !== campaign.sourceAuthority) throw new Error("wrong source authority");
  if (completion.challengeId !== campaign.challengeId) throw new Error("wrong challenge");
  if (completion.user !== user.wallet) throw new Error("same wallet required");
  if (completion.projectId !== user.projectId) throw new Error("same project required");
  if (!completion.completed) throw new Error("completion must be true");
  assertHash(completion.artifactHash, "artifactHash");
  if (now - user.moduleFinalizedAt < campaign.minElapsedSeconds) throw new Error("minimum elapsed time not met");
  const shipPeriod = periodFor(campaign, now);
  if (shipPeriod < user.modulePeriod + campaign.minPeriodGap) throw new Error("minimum period gap not met");
  return { ...user, stage: UserStage.Shipped, artifactHash: completion.artifactHash, shipCompletedAt: now, shipPeriod };
}

export function createReward(campaign, reward) {
  if (campaign.status !== CampaignStatus.Frozen && campaign.status !== CampaignStatus.Active) throw new Error("campaign must be frozen");
  if (reward.rewardAuthority !== campaign.rewardAuthority) throw new Error("wrong reward authority");
  assertPubkey(reward.mint, "mint");
  assertPubkey(reward.vault, "vault");
  if (!Number.isSafeInteger(reward.amountPerClaim) || reward.amountPerClaim <= 0) throw new Error("invalid claim amount");
  if (!Number.isInteger(reward.maxClaims) || reward.maxClaims <= 0) throw new Error("invalid capacity");
  return { ...reward, configHash: campaign.configHash, claimedCount: 0, fundedAmount: 0, status: RewardStatus.Draft };
}

export function fundReward(reward, amount) {
  if (reward.status !== RewardStatus.Draft) throw new Error("reward must be Draft");
  const required = reward.amountPerClaim * reward.maxClaims;
  if (!Number.isSafeInteger(required) || amount < required) throw new Error("insufficient funding");
  return { ...reward, fundedAmount: amount, status: RewardStatus.Funded };
}

export function activateReward(reward, now) {
  if (reward.status !== RewardStatus.Funded) throw new Error("reward must be Funded");
  if (now > reward.endsAt) throw new Error("reward window ended");
  return { ...reward, status: RewardStatus.Active };
}

export function claimReward(campaign, reward, user, recipient, signer, now) {
  if (signer !== user.wallet) throw new Error("claim signer mismatch");
  if (user.stage !== UserStage.Shipped) throw new Error("user has not shipped");
  if (reward.status !== RewardStatus.Active) throw new Error("reward inactive");
  if (reward.configHash !== campaign.configHash) throw new Error("reward config snapshot mismatch");
  if (now < reward.startsAt || now > reward.endsAt) throw new Error("claim outside window");
  if (recipient.owner !== signer || recipient.mint !== reward.mint) throw new Error("recipient token account mismatch");
  if (reward.claimedCount >= reward.maxClaims) throw new Error("inventory exhausted");
  return [
    { ...reward, claimedCount: reward.claimedCount + 1, fundedAmount: reward.fundedAmount - reward.amountPerClaim },
    { rewardId: reward.rewardId, user: signer, amount: reward.amountPerClaim, claimedAt: now }
  ];
}

function requireAuthority(campaign, signer) {
  if (signer !== campaign.authority) throw new Error("wrong campaign authority");
}

function requireCampaignActive(campaign) {
  if (campaign.status !== CampaignStatus.Active) throw new Error("campaign active status required");
  if (campaign.actionsPaused) throw new Error("campaign actions paused");
  if (!campaign.configHash) throw new Error("campaign must snapshot config hash");
}
