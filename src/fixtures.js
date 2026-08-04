import { sha256Hex } from "./crypto.js";

export const keys = Object.freeze({
  program: "BLoop1111111111111111111111111111111111111",
  authority: "Auth1111111111111111111111111111111111111",
  verifier: "Verif111111111111111111111111111111111111",
  rewardAuthority: "Reward1111111111111111111111111111111111",
  sourceProgram: "Cohort1111111111111111111111111111111111",
  sourceAuthority: "SrcAuth111111111111111111111111111111111",
  user: "User1111111111111111111111111111111111111",
  mint: "Mint1111111111111111111111111111111111111",
  vault: "VauT1111111111111111111111111111111111111"
});

export function hashFixture(label) {
  return sha256Hex(`builderloop-fixture:${label}`);
}

export function campaignFixture(overrides = {}) {
  return {
    authority: keys.authority,
    campaignId: 1,
    verifier: keys.verifier,
    verifierEpoch: 7,
    verifierActive: true,
    rewardAuthority: keys.rewardAuthority,
    startTs: 1_000,
    endTs: 1_000 + 60 * 8,
    periodSeconds: 60,
    totalPeriods: 8,
    minPeriodGap: 2,
    minElapsedSeconds: 120,
    moduleChallengeDelay: 30,
    moduleNamespace: 10,
    canonicalizerVersion: 1,
    sourceProgram: keys.sourceProgram,
    sourceAuthority: keys.sourceAuthority,
    challengeId: 42,
    actionsPaused: false,
    ...overrides
  };
}
