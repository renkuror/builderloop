import assert from "node:assert/strict";
import test from "node:test";
import {
  createCampaign,
  deactivateVerifier,
  finalizeCampaign,
  freezeCampaign,
  initUser,
  pauseActions,
  resumeActions,
  startCampaign,
  submitModule
} from "../src/protocol.js";
import { campaignFixture, hashFixture, keys } from "../src/fixtures.js";
import { moduleTestVerifier, signedVoucher } from "../test-support/module-signing.js";

function activeCampaign() {
  return startCampaign(freezeCampaign(createCampaign(campaignFixture({ verifier: moduleTestVerifier })), keys.authority), keys.authority);
}

function voucher(campaign) {
  return signedVoucher({
    builderloopProgramId: keys.program,
    campaignAuthority: campaign.authority,
    verifier: campaign.verifier,
    moduleNamespace: campaign.moduleNamespace,
    canonicalizerVersion: campaign.canonicalizerVersion,
    campaignConfigHash: campaign.configHash,
    user: keys.user,
    verifierEpoch: campaign.verifierEpoch,
    eventIdHash: hashFixture("campaign-adversarial-event"),
    projectId: hashFixture("campaign-adversarial-project"),
    projectSeedHash: hashFixture("campaign-adversarial-seed"),
    metadataHash: hashFixture("campaign-adversarial-metadata"),
    expiresAt: 2_000
  });
}

test("campaign authorities exclusively control pause, resume, verifier deactivation, and finalization", () => {
  const campaign = activeCampaign();
  for (const action of [pauseActions, resumeActions, deactivateVerifier, finalizeCampaign]) {
    assert.throws(() => action(campaign, keys.user), /authority/);
  }
  const paused = pauseActions(campaign, keys.authority);
  assert.equal(paused.actionsPaused, true);
  assert.throws(() => initUser(paused, keys.user, keys.user), /paused/);
  const resumed = resumeActions(paused, keys.authority);
  const deactivated = deactivateVerifier(resumed, keys.authority);
  assert.equal(deactivated.verifierEpoch, resumed.verifierEpoch + 1);
  assert.equal(deactivated.verifier, resumed.verifier);
  assert.throws(() => submitModule(deactivated, initUser(resumed, keys.user, keys.user), voucher(resumed), 1_010), /inactive/);
  const finalized = finalizeCampaign(resumed, keys.authority);
  assert.throws(() => initUser(finalized, keys.user, keys.user), /active status/);
});

test("user progress is bound to one frozen campaign and wallet signer", () => {
  const campaign = activeCampaign();
  const anotherCampaign = startCampaign(freezeCampaign(createCampaign(campaignFixture({ campaignId: 2, verifier: moduleTestVerifier })), keys.authority), keys.authority);
  const user = initUser(campaign, keys.user, keys.user);
  assert.throws(() => initUser(campaign, keys.user, keys.authority), /wallet signer/);
  assert.throws(() => submitModule(anotherCampaign, user, voucher(anotherCampaign), 1_010), /campaign binding/);
});
