import { DOMAINS, ZERO32 } from "./constants.js";
import { assertHash, assertPubkey, publicKeyBytes, sha256Hex } from "./crypto.js";

export const MAX_LOYALTY_SCORE = 1_000;
export const LOYALTY_TIERS = Object.freeze(["Bronze", "Silver", "Gold", "Platinum"]);

export function validateHeartbeatPolicy(policy) {
  for (const key of ["builderloopProgramId", "campaign", "authority", "verifier"]) assertPubkey(policy[key], key);
  assertHash(policy.campaignConfigHash, "campaignConfigHash");
  for (const key of ["verifierEpoch", "policyEpoch"]) {
    if (!Number.isInteger(policy[key]) || policy[key] < 0 || policy[key] > 0xffffffff) throw new Error(`${key} must be a u32`);
  }
  for (const key of ["heartbeatSeconds", "minimumReturnInterval", "activatedAt"]) {
    if (!Number.isSafeInteger(policy[key])) throw new Error(`${key} must be a safe integer`);
  }
  if (policy.heartbeatSeconds <= 0 || policy.minimumReturnInterval <= 0 || policy.minimumReturnInterval > policy.heartbeatSeconds || policy.policyEpoch === 0) {
    throw new Error("invalid heartbeat policy");
  }
  for (const key of ["activeCredit", "streakBonus", "streakBonusCap", "decayPerMissedPeriod", "bronzeThreshold", "silverThreshold", "goldThreshold", "platinumThreshold"]) {
    if (!Number.isInteger(policy[key]) || policy[key] < 0 || policy[key] > 0xffff) throw new Error(`${key} must be a u16`);
  }
  if (policy.activeCredit === 0 || policy.streakBonusCap === 0 || policy.decayPerMissedPeriod === 0) throw new Error("invalid score parameters");
  if (policy.activeCredit + policy.streakBonus * policy.streakBonusCap > MAX_LOYALTY_SCORE) throw new Error("score credit exceeds maximum");
  if (policy.bronzeThreshold !== 0 || policy.silverThreshold <= policy.bronzeThreshold || policy.goldThreshold <= policy.silverThreshold || policy.platinumThreshold <= policy.goldThreshold || policy.platinumThreshold > MAX_LOYALTY_SCORE) {
    throw new Error("invalid tier thresholds");
  }
  return true;
}

export function heartbeatConfigBytes(policy) {
  validateHeartbeatPolicy(policy);
  return Buffer.concat([
    Buffer.from(DOMAINS.HEARTBEAT_CONFIG),
    Buffer.from(publicKeyBytes(policy.builderloopProgramId)),
    Buffer.from(publicKeyBytes(policy.campaign)),
    Buffer.from(policy.campaignConfigHash, "hex"),
    Buffer.from(publicKeyBytes(policy.authority)),
    Buffer.from(publicKeyBytes(policy.verifier)),
    u32(policy.verifierEpoch, "verifierEpoch"),
    i64(policy.heartbeatSeconds, "heartbeatSeconds"),
    i64(policy.minimumReturnInterval, "minimumReturnInterval"),
    u16(policy.activeCredit, "activeCredit"),
    u16(policy.streakBonus, "streakBonus"),
    u16(policy.streakBonusCap, "streakBonusCap"),
    u16(policy.decayPerMissedPeriod, "decayPerMissedPeriod"),
    u16(policy.bronzeThreshold, "bronzeThreshold"),
    u16(policy.silverThreshold, "silverThreshold"),
    u16(policy.goldThreshold, "goldThreshold"),
    u16(policy.platinumThreshold, "platinumThreshold"),
    u32(policy.policyEpoch, "policyEpoch"),
    i64(policy.activatedAt, "activatedAt"),
  ]);
}

export function heartbeatConfigHash(policy) {
  return sha256Hex(heartbeatConfigBytes(policy));
}

export function heartbeatActivityBytes(activity) {
  for (const key of ["builderloopProgramId", "loyaltyConfig", "campaign", "wallet", "verifier"]) assertPubkey(activity[key], key);
  for (const key of ["activityIdHash", "metadataHash"]) assertHash(activity[key], key);
  for (const key of ["verifierEpoch", "policyEpoch"]) {
    if (!Number.isInteger(activity[key]) || activity[key] < 0 || activity[key] > 0xffffffff) throw new Error(`${key} must be a u32`);
  }
  if (!Number.isInteger(activity.activityKind) || activity.activityKind <= 0 || activity.activityKind > 0xffff) throw new Error("activityKind must be a non-zero u16");
  for (const key of ["issuedAt", "expiresAt"]) if (!Number.isSafeInteger(activity[key])) throw new Error(`${key} must be a safe integer`);
  if (activity.policyEpoch === 0 || activity.issuedAt > activity.expiresAt) throw new Error("invalid heartbeat activity");
  return Buffer.concat([
    Buffer.from(DOMAINS.HEARTBEAT_ACTIVITY),
    Buffer.from(publicKeyBytes(activity.builderloopProgramId)),
    Buffer.from(publicKeyBytes(activity.loyaltyConfig)),
    Buffer.from(publicKeyBytes(activity.campaign)),
    Buffer.from(publicKeyBytes(activity.wallet)),
    Buffer.from(publicKeyBytes(activity.verifier)),
    u32(activity.verifierEpoch, "verifierEpoch"),
    u32(activity.policyEpoch, "policyEpoch"),
    u16(activity.activityKind, "activityKind"),
    Buffer.from(activity.activityIdHash, "hex"),
    Buffer.from(activity.metadataHash, "hex"),
    i64(activity.issuedAt, "issuedAt"),
    i64(activity.expiresAt, "expiresAt"),
  ]);
}

export function heartbeatActivityHash(activity) {
  return sha256Hex(heartbeatActivityBytes(activity));
}

export function elapsedHeartbeatPeriods(lastMeaningfulActivityAt, now, heartbeatSeconds) {
  if (!Number.isSafeInteger(lastMeaningfulActivityAt) || !Number.isSafeInteger(now) || !Number.isSafeInteger(heartbeatSeconds) || heartbeatSeconds <= 0) throw new Error("invalid heartbeat timing");
  const elapsed = now - lastMeaningfulActivityAt;
  if (!Number.isSafeInteger(elapsed) || elapsed < 0) throw new Error("timestamp precedes last meaningful activity");
  return Math.floor(elapsed / heartbeatSeconds);
}

export function missedHeartbeatPeriods(elapsedPeriods) {
  if (!Number.isSafeInteger(elapsedPeriods) || elapsedPeriods < 0) throw new Error("invalid elapsed periods");
  return Math.max(0, elapsedPeriods - 1);
}

export function tierForScore(score, policy) {
  validateHeartbeatPolicy(policy);
  if (!Number.isInteger(score) || score < 0 || score > MAX_LOYALTY_SCORE) throw new Error("score is outside the bounded range");
  if (score >= policy.platinumThreshold) return "Platinum";
  if (score >= policy.goldThreshold) return "Gold";
  if (score >= policy.silverThreshold) return "Silver";
  return "Bronze";
}

export function effectiveLoyalty(state, policy, now) {
  validateHeartbeatPolicy(policy);
  validateState(state);
  const elapsedPeriods = elapsedHeartbeatPeriods(state.lastMeaningfulActivityAt, now, policy.heartbeatSeconds);
  const missedPeriods = missedHeartbeatPeriods(elapsedPeriods);
  const decay = BigInt(missedPeriods) * BigInt(policy.decayPerMissedPeriod);
  const score = Number((BigInt(state.scoreAtLastSettlement) - decay) > 0n ? BigInt(state.scoreAtLastSettlement) - decay : 0n);
  const nextDecayAt = state.lastMeaningfulActivityAt + policy.heartbeatSeconds * 2;
  if (!Number.isSafeInteger(nextDecayAt)) throw new Error("next decay timestamp overflowed");
  return {
    effectiveScore: score,
    effectiveStreak: missedPeriods === 0 ? state.streak : 0,
    elapsedPeriods,
    missedPeriods,
    nextDecayAt,
    tier: tierForScore(score, policy),
  };
}

export function firstLoyaltyActivity(policy) {
  validateHeartbeatPolicy(policy);
  const streak = 1;
  return { score: activityCredit(streak, policy), streak, elapsedPeriods: 0, missedPeriods: 0 };
}

export function applyLoyaltyActivity(state, policy, now) {
  validateHeartbeatPolicy(policy);
  validateState(state);
  const elapsed = now - state.lastMeaningfulActivityAt;
  if (!Number.isSafeInteger(elapsed) || elapsed < policy.minimumReturnInterval) throw new Error("activity is before the minimum return interval");
  const view = effectiveLoyalty(state, policy, now);
  const streak = view.missedPeriods === 0 ? Math.min(0xffff, state.streak + 1) : 1;
  return {
    score: Math.min(MAX_LOYALTY_SCORE, view.effectiveScore + activityCredit(streak, policy)),
    streak,
    elapsedPeriods: view.elapsedPeriods,
    missedPeriods: view.missedPeriods,
  };
}

function validateState(state) {
  for (const key of ["scoreAtLastSettlement", "streak"]) {
    if (!Number.isInteger(state[key]) || state[key] < 0 || state[key] > (key === "scoreAtLastSettlement" ? MAX_LOYALTY_SCORE : 0xffff)) throw new Error(`invalid ${key}`);
  }
  if (!Number.isSafeInteger(state.lastMeaningfulActivityAt)) throw new Error("invalid lastMeaningfulActivityAt");
}

function activityCredit(streak, policy) {
  const credit = policy.activeCredit + policy.streakBonus * Math.min(streak, policy.streakBonusCap);
  if (!Number.isSafeInteger(credit) || credit > MAX_LOYALTY_SCORE) throw new Error("activity credit overflowed");
  return credit;
}

function u16(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) throw new Error(`${name} must be a u16`);
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(value);
  return bytes;
}

function u32(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error(`${name} must be a u32`);
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(value);
  return bytes;
}

function i64(value, name) {
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be a safe integer`);
  const bytes = Buffer.alloc(8);
  bytes.writeBigInt64LE(BigInt(value));
  return bytes;
}

export function isZeroActivityHash(value) {
  return value === ZERO32;
}
