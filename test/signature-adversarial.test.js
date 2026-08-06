import assert from "node:assert/strict";
import test from "node:test";
import {
  createCampaign,
  freezeCampaign,
  initUser,
  projectId,
  startCampaign,
  submitModule,
  verifyModuleAttestation
} from "../src/protocol.js";
import { campaignFixture, hashFixture, keys } from "../src/fixtures.js";
import { moduleTestVerifier, signedVoucher } from "../test-support/module-signing.js";

function signedFixture(campaign) {
  const seed = hashFixture("signature-seed");
  return signedVoucher({
    builderloopProgramId: keys.program,
    campaignAuthority: campaign.authority,
    verifier: campaign.verifier,
    moduleNamespace: campaign.moduleNamespace,
    canonicalizerVersion: campaign.canonicalizerVersion,
    campaignConfigHash: campaign.configHash,
    user: keys.user,
    verifierEpoch: campaign.verifierEpoch,
    eventIdHash: hashFixture("signature-event"),
    projectId: projectId({ programId: keys.program, campaign: campaign.authority, user: keys.user, projectSeedHash: seed }),
    projectSeedHash: seed,
    metadataHash: hashFixture("signature-metadata"),
    expiresAt: 2_000
  });
}

test("Module attestation accepts the signed fixed payload and rejects field or signature substitution", () => {
  const campaign = startCampaign(
    freezeCampaign(createCampaign(campaignFixture({ verifier: moduleTestVerifier })), keys.authority),
    keys.authority
  );
  const voucher = signedFixture(campaign);
  assert.equal(verifyModuleAttestation(voucher, campaign.verifier), true);
  assert.equal(submitModule(campaign, initUser(campaign, keys.user, keys.user), voucher, 1_010)[1].status, "Pending");
  assert.equal(verifyModuleAttestation({ ...voucher, projectId: hashFixture("substituted-project") }, campaign.verifier), false);
  assert.throws(
    () => submitModule(campaign, initUser(campaign, keys.user, keys.user), { ...voucher, signature: "invalid" }, 1_010),
    /Ed25519 signature/
  );
});
