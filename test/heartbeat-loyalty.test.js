import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_LOYALTY_SCORE,
  applyLoyaltyActivity,
  effectiveLoyalty,
  firstLoyaltyActivity,
  heartbeatActivityBytes,
  heartbeatActivityHash,
  heartbeatConfigBytes,
  heartbeatConfigHash,
  tierForScore,
  validateHeartbeatPolicy,
} from "../src/loyalty.js";
import { deriveEffectiveLoyalty as deriveBrowserLoyalty, tierForScore as browserTierForScore } from "../web/loyalty.js";

const policy = Object.freeze({
  builderloopProgramId: "GgBaCs3NCBuZN12kCJgAW63ydqohFkHEdfdEXBPzLHq",
  campaign: "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
  campaignConfigHash: "06".repeat(32),
  authority: "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
  verifier: "8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR",
  verifierEpoch: 3,
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
  policyEpoch: 1,
  activatedAt: 1_000,
});

test("heartbeat policy and activity bytes match the Rust fixed-width vectors", () => {
  assert.equal(heartbeatConfigBytes(policy).length, 239);
  assert.equal(heartbeatConfigHash(policy), "c9d7b8f023f99c7c3351f0f310f4c5e75631269e392703466474e7a6543d8c1f");
  const activity = {
    builderloopProgramId: policy.builderloopProgramId,
    loyaltyConfig: "CktRuQ2mttgRGkXJtyksdKHjUdc2C4TgDzyB98oEzy8",
    campaign: policy.campaign,
    wallet: "LbUiWL3xVV8hTFYBVdbTNrpDo41NKS6o3LHHuDzjfcY",
    verifier: policy.verifier,
    verifierEpoch: 3,
    policyEpoch: 1,
    activityKind: 1,
    activityIdHash: "07".repeat(32),
    metadataHash: "08".repeat(32),
    issuedAt: 1_000,
    expiresAt: 1_060,
  };
  assert.equal(heartbeatActivityBytes(activity).length, 283);
  assert.equal(heartbeatActivityHash(activity), "a0c40318600fbf3866fb6bc856418d188612f72b8bd95befbda5513205acdadc");
});

test("first activity, anti-burst, streak credit, and lazy decay use the documented formula", () => {
  const first = firstLoyaltyActivity(policy);
  assert.deepEqual(first, { score: 350, streak: 1, elapsedPeriods: 0, missedPeriods: 0 });
  const state = { scoreAtLastSettlement: first.score, lastMeaningfulActivityAt: 1_000, streak: first.streak };
  assert.throws(() => applyLoyaltyActivity(state, policy, 1_010), /minimum return interval/);
  const second = applyLoyaltyActivity(state, policy, 1_015);
  assert.deepEqual(second, { score: 750, streak: 2, elapsedPeriods: 0, missedPeriods: 0 });
  const view = effectiveLoyalty({ scoreAtLastSettlement: second.score, lastMeaningfulActivityAt: 1_015, streak: second.streak }, policy, 1_055);
  assert.equal(view.effectiveScore, 550);
  assert.equal(view.effectiveStreak, 0);
  assert.equal(view.missedPeriods, 1);
  assert.equal(view.nextDecayAt, 1_055);
  assert.equal(view.tier, "Silver");
});

test("tier boundaries, saturation, and long inactivity stay bounded", () => {
  assert.equal(tierForScore(0, policy), "Bronze");
  assert.equal(tierForScore(300, policy), "Silver");
  assert.equal(tierForScore(600, policy), "Gold");
  assert.equal(tierForScore(850, policy), "Platinum");
  const exhausted = effectiveLoyalty({ scoreAtLastSettlement: 1, lastMeaningfulActivityAt: 1_000, streak: 65_535 }, policy, 1_000 + policy.heartbeatSeconds * 100_000);
  assert.equal(exhausted.effectiveScore, 0);
  assert.ok(exhausted.effectiveScore <= MAX_LOYALTY_SCORE);
});

test("streak bonus is capped instead of growing with an unbounded historical streak", () => {
  const transition = applyLoyaltyActivity({ scoreAtLastSettlement: 0, lastMeaningfulActivityAt: 1_000, streak: 65_535 }, policy, 1_015);
  assert.equal(transition.streak, 65_535);
  assert.equal(transition.score, 500, "300 active credit + four capped 50-point streak bonuses");
});

test("browser read-only derivation matches the protocol reference vectors", () => {
  const state = { scoreAtLastSettlement: 750, lastMeaningfulActivityAt: 1_015, streak: 2 };
  const reference = effectiveLoyalty(state, policy, 1_055);
  const browser = deriveBrowserLoyalty(policy, state, 1_055);
  assert.deepEqual(browser, {
    effectiveScore: reference.effectiveScore,
    effectiveStreak: reference.effectiveStreak,
    elapsedPeriods: reference.elapsedPeriods,
    missedPeriods: reference.missedPeriods,
    nextDecayAt: reference.nextDecayAt,
    tier: reference.tier.toUpperCase(),
  });
  assert.equal(browserTierForScore(850, policy), "PLATINUM");
});

test("invalid policies reject zero heartbeat, invalid interval, thresholds, and unsafe credit", () => {
  assert.throws(() => validateHeartbeatPolicy({ ...policy, heartbeatSeconds: 0 }), /invalid heartbeat policy/);
  assert.throws(() => validateHeartbeatPolicy({ ...policy, minimumReturnInterval: 0 }), /invalid heartbeat policy/);
  assert.throws(() => validateHeartbeatPolicy({ ...policy, minimumReturnInterval: 21 }), /invalid heartbeat policy/);
  assert.throws(() => validateHeartbeatPolicy({ ...policy, goldThreshold: 300 }), /invalid tier thresholds/);
  assert.throws(() => validateHeartbeatPolicy({ ...policy, decayPerMissedPeriod: 0 }), /invalid score parameters/);
  assert.throws(() => validateHeartbeatPolicy({ ...policy, activeCredit: 900 }), /score credit/);
});
