import assert from "node:assert/strict";
import test from "node:test";
import {
  activateReward,
  claimReward,
  configHash,
  createCampaign,
  createReward,
  finalizeModule,
  freezeCampaign,
  fundReward,
  initUser,
  periodFor,
  projectId,
  recordNativeShip,
  startCampaign,
  submitModule
} from "../src/protocol.js";
import { campaignFixture, hashFixture, keys } from "../src/fixtures.js";

function activeCampaign() {
  return startCampaign(freezeCampaign(createCampaign(campaignFixture()), keys.authority), keys.authority);
}

function voucher(campaign, overrides = {}) {
  const seed = hashFixture("project-seed");
  return {
    campaignConfigHash: campaign.configHash,
    user: keys.user,
    verifierEpoch: campaign.verifierEpoch,
    eventIdHash: hashFixture("event-1"),
    projectId: projectId({ programId: keys.program, campaign: keys.authority, user: keys.user, projectSeedHash: seed }),
    projectSeedHash: seed,
    metadataHash: hashFixture("metadata"),
    expiresAt: 10_000,
    ...overrides
  };
}

function finalizedUser() {
  const campaign = activeCampaign();
  const user = initUser(campaign, keys.user, keys.user);
  const [pendingUser, receipt] = submitModule(campaign, user, voucher(campaign), 1_010);
  const [finalUser] = finalizeModule(campaign, pendingUser, receipt, 1_040);
  return { campaign, user: finalUser };
}

test("config hash is deterministic and covers critical fields", () => {
  const base = campaignFixture();
  assert.equal(configHash(base), configHash({ ...base }));
  for (const field of ["verifier", "rewardAuthority", "periodSeconds", "minPeriodGap", "sourceProgram", "sourceAuthority", "challengeId"]) {
    const changed = { ...base, [field]: field === "periodSeconds" ? 120 : field === "minPeriodGap" ? 3 : field === "challengeId" ? 43 : keys.user };
    if (field === "periodSeconds") changed.totalPeriods = 4;
    assert.notEqual(configHash(base), configHash(changed), field);
  }
});

test("invalid timing and period math fails", () => {
  assert.throws(() => createCampaign(campaignFixture({ periodSeconds: 0 })), /periodSeconds/);
  assert.throws(() => periodFor(campaignFixture(), 999), /outside campaign/);
  assert.throws(() => periodFor(campaignFixture(), 1_481), /outside campaign|period outside/);
});

test("campaign freezes immutable hash and requires authority", () => {
  const draft = createCampaign(campaignFixture());
  assert.throws(() => freezeCampaign(draft, keys.user), /wrong campaign authority/);
  const frozen = freezeCampaign(draft, keys.authority);
  assert.equal(frozen.configHash, configHash(draft));
  assert.throws(() => freezeCampaign(frozen, keys.authority), /Draft/);
});

test("module pending does not unlock Ship and early finalize fails", () => {
  const campaign = activeCampaign();
  const user = initUser(campaign, keys.user, keys.user);
  const [pendingUser, receipt] = submitModule(campaign, user, voucher(campaign), 1_010);
  assert.throws(() => finalizeModule(campaign, pendingUser, receipt, 1_020), /challenge delay/);
  assert.throws(() => recordNativeShip(campaign, pendingUser, {}, keys.user, 1_200), /module must be finalized/);
});

test("stale verifier epoch cannot finalize pending receipt", () => {
  const campaign = activeCampaign();
  const user = initUser(campaign, keys.user, keys.user);
  const [pendingUser, receipt] = submitModule(campaign, user, voucher(campaign), 1_010);
  const staleCampaign = { ...campaign, verifierEpoch: campaign.verifierEpoch + 1, verifierActive: false };
  assert.throws(() => finalizeModule(staleCampaign, pendingUser, receipt, 1_050), /stale pending/);
});

test("valid module finalization stores project commitment and period", () => {
  const { user } = finalizedUser();
  assert.equal(user.stage, "ModuleFinalized");
  assert.equal(user.modulePeriod, 0);
  assert.match(user.projectId, /^[0-9a-f]{64}$/);
});

test("native Ship enforces wallet, source, challenge, project, elapsed, and period gap", () => {
  const { campaign, user } = finalizedUser();
  const completion = {
    owner: keys.sourceProgram,
    authority: keys.sourceAuthority,
    challengeId: campaign.challengeId,
    user: keys.user,
    projectId: user.projectId,
    artifactHash: hashFixture("artifact"),
    completed: true
  };
  assert.throws(() => recordNativeShip(campaign, user, completion, keys.user, 1_100), /minimum elapsed/);
  assert.throws(() => recordNativeShip(campaign, user, { ...completion, user: keys.authority }, keys.user, 1_180), /same wallet/);
  assert.throws(() => recordNativeShip(campaign, user, { ...completion, owner: keys.program }, keys.user, 1_180), /source owner/);
  const shipped = recordNativeShip(campaign, user, completion, keys.user, 1_180);
  assert.equal(shipped.stage, "Shipped");
  assert.throws(() => recordNativeShip(campaign, shipped, completion, keys.user, 1_181), /module must be finalized/);
});

test("reward lifecycle fixes amount, recipient, inventory, and duplicate claim surface", () => {
  const { campaign, user } = finalizedUser();
  const shipped = recordNativeShip(campaign, user, {
    owner: keys.sourceProgram,
    authority: keys.sourceAuthority,
    challengeId: campaign.challengeId,
    user: keys.user,
    projectId: user.projectId,
    artifactHash: hashFixture("artifact"),
    completed: true
  }, keys.user, 1_180);
  const reward = createReward(campaign, {
    rewardAuthority: keys.rewardAuthority,
    rewardId: 1,
    mint: keys.mint,
    vault: keys.vault,
    amountPerClaim: 100,
    maxClaims: 1,
    startsAt: 1_000,
    endsAt: 2_000
  });
  assert.throws(() => activateReward(reward, 1_100), /Funded/);
  const active = activateReward(fundReward(reward, 100), 1_100);
  assert.throws(() => claimReward(campaign, active, shipped, { owner: keys.authority, mint: keys.mint }, keys.user, 1_180), /recipient/);
  const [afterClaim, claim] = claimReward(campaign, active, shipped, { owner: keys.user, mint: keys.mint }, keys.user, 1_180);
  assert.equal(claim.amount, 100);
  assert.equal(afterClaim.claimedCount, 1);
  assert.throws(() => claimReward(campaign, afterClaim, shipped, { owner: keys.user, mint: keys.mint }, keys.user, 1_181), /inventory exhausted/);
});
