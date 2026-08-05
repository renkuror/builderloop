import assert from "node:assert/strict";
import test from "node:test";
import { attestationBytes, attestationHash, configBytes, configHash, periodFor, projectId, validateCampaignConfig } from "../src/protocol.js";

const key = (value) => ({
  1: "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
  2: "8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR",
  3: "CktRuQ2mttgRGkXJtyksdKHjUdc2C4TgDzyB98oEzy8",
  4: "GgBaCs3NCBuZN12kCJgAW63ydqohFkHEdfdEXBPzLHq",
  5: "LbUiWL3xVV8hTFYBVdbTNrpDo41NKS6o3LHHuDzjfcY"
})[value];

const config = {
  authority: key(1),
  campaignId: 7,
  verifier: key(2),
  verifierEpoch: 3,
  verifierActive: true,
  rewardAuthority: key(3),
  startTs: 1_000,
  endTs: 1_480,
  periodSeconds: 120,
  totalPeriods: 4,
  minPeriodGap: 1,
  minElapsedSeconds: 120,
  moduleChallengeDelay: 30,
  moduleNamespace: 12,
  canonicalizerVersion: 1,
  sourceProgram: key(4),
  sourceAuthority: key(5),
  challengeId: 42,
  actionsPaused: false
};

test("wire vectors match the Rust campaign, config-hash, and project-id layouts", () => {
  assert.equal(configBytes(config).length, 249);
  assert.equal(configHash(config), "916ad27666fd9a6c98a84affcc11497908840b8d9c4b060c3b31aa7af6980c7e");
  const project = projectId({ programId: key(4), campaign: key(1), user: key(2), projectSeedHash: "09".repeat(32) });
  assert.equal(project, "71e340d783afcac7e744853fc61a518c16b5820b4e4f4e375e28a88fb30a2762");
  const payload = {
    builderloopProgramId: key(4), campaign: key(1), user: key(2), verifierEpoch: 3,
    eventIdHash: "07".repeat(32), projectId: project, projectSeedHash: "09".repeat(32),
    metadataHash: "08".repeat(32), expiresAt: 2_000
  };
  assert.equal(attestationBytes(payload).length, 257);
  assert.equal(attestationHash(payload), "0514666544cdca4ff5660ca1fd4600dc1283b8a440e69c1f66caed09c16a3b7d");
});

test("layout validation rejects schedule mismatch, zero periods, and invalid timestamps", () => {
  assert.throws(() => validateCampaignConfig({ ...config, totalPeriods: 3 }), /totalPeriods/);
  assert.throws(() => validateCampaignConfig({ ...config, periodSeconds: 0 }), /periodSeconds/);
  assert.throws(() => periodFor(config, config.endTs), /outside campaign/);
});
