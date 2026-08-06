export const DOMAINS = Object.freeze({
  CONFIG: "BUILDERLOOP_CONFIG_V1",
  PROJECT: "BUILDERLOOP_PROJECT_V1",
  MODULE: "BUILDERLOOP_MODULE_V1",
  COMPLETION: "COHORTBUILD_COMPLETION_V1",
  REWARD: "BUILDERLOOP_REWARD_V1"
});

export const ZERO32 = "00".repeat(32);
export const PUBKEY_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const HASH_RE = /^[0-9a-f]{64}$/;

export const CampaignStatus = Object.freeze({
  Draft: "Draft",
  Frozen: "Frozen",
  Active: "Active",
  Finalized: "Finalized"
});

export const UserStage = Object.freeze({
  Initialized: "Initialized",
  ModulePending: "ModulePending",
  ModuleFinalized: "ModuleFinalized",
  Shipped: "Shipped"
});

export const ReceiptStatus = Object.freeze({
  Pending: "Pending",
  Finalized: "Finalized",
  Cancelled: "Cancelled"
});

export const RewardStatus = Object.freeze({
  Draft: "Draft",
  Funded: "Funded",
  Active: "Active",
  Paused: "Paused",
  Ended: "Ended",
  Closed: "Closed"
});
