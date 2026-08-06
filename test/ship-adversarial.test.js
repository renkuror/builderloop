import assert from "node:assert/strict";
import test from "node:test";
import {
  completionPda,
  createCampaign,
  finalizeModule,
  freezeCampaign,
  initUser,
  projectId,
  recordNativeShip,
  startCampaign,
  submitModule
} from "../src/protocol.js";
import { campaignFixture, hashFixture, keys } from "../src/fixtures.js";
import { moduleTestVerifier, signedVoucher } from "../test-support/module-signing.js";

function finalizedUser() {
  const campaign = startCampaign(freezeCampaign(createCampaign(campaignFixture({ verifier: moduleTestVerifier })), keys.authority), keys.authority);
  const seed = hashFixture("ship-seed");
  const voucher = signedVoucher({
    builderloopProgramId: keys.program,
    campaignAuthority: campaign.authority,
    verifier: campaign.verifier,
    moduleNamespace: campaign.moduleNamespace,
    canonicalizerVersion: campaign.canonicalizerVersion,
    campaignConfigHash: campaign.configHash,
    user: keys.user,
    verifierEpoch: campaign.verifierEpoch,
    eventIdHash: hashFixture("ship-event"),
    projectId: projectId({ programId: keys.program, campaign: campaign.authority, user: keys.user, projectSeedHash: seed }),
    projectSeedHash: seed,
    metadataHash: hashFixture("ship-metadata"),
    expiresAt: 2_000
  });
  const [pending, receipt] = submitModule(campaign, initUser(campaign, keys.user, keys.user), voucher, 1_010);
  const [user] = finalizeModule(campaign, pending, receipt, 1_040);
  return { campaign, user };
}

test("Ship rejects a substituted Completion discriminator or deterministic completion address", () => {
  const { campaign, user } = finalizedUser();
  const completion = {
    owner: campaign.sourceProgram,
    authority: campaign.sourceAuthority,
    discriminator: "COHORTBUILD_COMPLETION_V1",
    pda: completionPda(campaign, keys.user),
    challengeId: campaign.challengeId,
    user: keys.user,
    projectId: user.projectId,
    artifactHash: hashFixture("ship-artifact"),
    completed: true
  };

  assert.throws(() => recordNativeShip(campaign, user, { ...completion, discriminator: "OTHER" }, keys.user, 1_180), /discriminator/);
  assert.throws(() => recordNativeShip(campaign, user, { ...completion, pda: hashFixture("substituted-completion") }, keys.user, 1_180), /Completion PDA/);
  assert.equal(recordNativeShip(campaign, user, completion, keys.user, 1_180).stage, "Shipped");
});
