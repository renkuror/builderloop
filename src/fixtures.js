import { sha256Hex } from "./crypto.js";

export const keys = Object.freeze({
  authority: "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
  verifier: "8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR",
  rewardAuthority: "CktRuQ2mttgRGkXJtyksdKHjUdc2C4TgDzyB98oEzy8",
  sourceProgram: "GgBaCs3NCBuZN12kCJgAW63ydqohFkHEdfdEXBPzLHq",
  sourceAuthority: "LbUiWL3xVV8hTFYBVdbTNrpDo41NKS6o3LHHuDzjfcY",
  program: "QWmroo4YnnMqYW3cnxWkFdaTxGD3P7vMSzwMHGbUzwF",
  user: "US517G5965aydkZ46HS38QLi7UQiSojurfbQfKCELFx",
  mint: "YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf",
  vault: "cGfHiC6Kgg3FpFZvgwGcswsCRtp4aBP2fzuXRQPizuN"
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
