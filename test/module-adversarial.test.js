import assert from "node:assert/strict";
import test from "node:test";
import {
  CampaignLedger,
  createCampaign,
  freezeCampaign,
  projectId,
  startCampaign
} from "../src/protocol.js";
import { campaignFixture, hashFixture, keys } from "../src/fixtures.js";

function activeLedger() {
  const campaign = startCampaign(freezeCampaign(createCampaign(campaignFixture()), keys.authority), keys.authority);
  return new CampaignLedger(campaign);
}

function voucher(campaign, overrides = {}) {
  const projectSeedHash = hashFixture("module-seed");
  return {
    builderloopProgramId: keys.program,
    campaignAuthority: campaign.authority,
    verifier: campaign.verifier,
    moduleNamespace: campaign.moduleNamespace,
    canonicalizerVersion: campaign.canonicalizerVersion,
    campaignConfigHash: campaign.configHash,
    user: keys.user,
    verifierEpoch: campaign.verifierEpoch,
    eventIdHash: hashFixture("module-event"),
    projectId: projectId({ programId: keys.program, campaign: keys.authority, user: keys.user, projectSeedHash }),
    projectSeedHash,
    metadataHash: hashFixture("module-metadata"),
    expiresAt: 2_000,
    ...overrides
  };
}

test("receipt ledger makes canonical events single-use even when a pending receipt is cancelled", () => {
  const ledger = activeLedger();
  ledger.initUser(keys.user, keys.user);
  const receipt = ledger.submitModule(keys.user, voucher(ledger.campaign), 1_010);
  ledger.cancelPendingModule(keys.user, keys.user, receipt.eventIdHash);
  assert.throws(() => ledger.submitModule(keys.user, voucher(ledger.campaign), 1_020), /canonical event already used/);
  assert.throws(() => ledger.finalizeModule(keys.user, receipt.eventIdHash, 1_050), /Cancelled/);
});

test("receipt ledger rejects expiry, wrong verifier epoch, other-wallet vouchers, and early finalization", () => {
  const ledger = activeLedger();
  ledger.initUser(keys.user, keys.user);
  assert.throws(() => ledger.submitModule(keys.user, voucher(ledger.campaign, { expiresAt: 1_009 }), 1_010), /expired/);
  assert.throws(() => ledger.submitModule(keys.user, voucher(ledger.campaign, { verifierEpoch: 99 }), 1_010), /epoch/);
  assert.throws(() => ledger.submitModule(keys.user, voucher(ledger.campaign, { user: keys.authority }), 1_010), /user mismatch/);
  const receipt = ledger.submitModule(keys.user, voucher(ledger.campaign), 1_010);
  assert.throws(() => ledger.finalizeModule(keys.user, receipt.eventIdHash, 1_039), /challenge delay/);
  const user = ledger.finalizeModule(keys.user, receipt.eventIdHash, 1_040);
  assert.equal(user.projectId, receipt.projectId);
  assert.equal(user.projectSeedHash, receipt.projectSeedHash);
});

test("Module receipt accepts only the frozen program, campaign, verifier, namespace, and canonicalizer", () => {
  const ledger = activeLedger();
  ledger.initUser(keys.user, keys.user);
  const checks = [
    ["builderloopProgramId", keys.sourceProgram, /program domain/],
    ["campaignAuthority", keys.user, /campaign domain/],
    ["verifier", keys.user, /verifier/],
    ["moduleNamespace", 99, /namespace/],
    ["canonicalizerVersion", 99, /canonicalizer/]
  ];
  for (const [field, value, message] of checks) {
    assert.throws(() => ledger.submitModule(keys.user, voucher(ledger.campaign, { [field]: value }), 1_010), message);
  }
});
