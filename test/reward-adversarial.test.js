import assert from "node:assert/strict";
import test from "node:test";
import {
  RewardLedger,
  activateReward,
  createCampaign,
  createReward,
  freezeCampaign,
  fundReward,
  pauseReward,
  resumeReward,
  startCampaign,
  withdrawRemainingInventory,
  closeReward
} from "../src/protocol.js";
import { campaignFixture, keys } from "../src/fixtures.js";

function frozenCampaign() {
  return startCampaign(freezeCampaign(createCampaign(campaignFixture()), keys.authority), keys.authority);
}

function rewardInput(overrides = {}) {
  return {
    rewardAuthority: keys.rewardAuthority,
    rewardId: 21,
    mint: keys.mint,
    vault: keys.vault,
    amountPerClaim: 100,
    maxClaims: 2,
    startsAt: 1_100,
    endsAt: 2_000,
    ...overrides
  };
}

test("reward creation, funding, activation, pausing, withdrawal, and closure require the frozen reward authority", () => {
  const campaign = frozenCampaign();
  assert.throws(() => createReward(campaign, rewardInput(), keys.user), /reward authority/);

  const draft = createReward(campaign, rewardInput(), keys.rewardAuthority);
  assert.throws(() => fundReward(draft, 200, keys.user), /reward authority/);
  const funded = fundReward(draft, 200, keys.rewardAuthority);
  assert.throws(() => activateReward(funded, 1_200, keys.user), /reward authority/);
  const active = activateReward(funded, 1_200, keys.rewardAuthority);
  assert.throws(() => pauseReward(active, keys.user), /reward authority/);
  const paused = pauseReward(active, keys.rewardAuthority);
  assert.throws(() => resumeReward(paused, keys.user), /reward authority/);
  const resumed = resumeReward(paused, keys.rewardAuthority);

  assert.throws(() => withdrawRemainingInventory(resumed, keys.rewardAuthority, { owner: keys.rewardAuthority, mint: keys.mint }, 2_000), /deadline/);
  assert.throws(() => withdrawRemainingInventory(resumed, keys.user, { owner: keys.user, mint: keys.mint }, 2_001), /reward authority/);
  const [ended, withdrawal] = withdrawRemainingInventory(resumed, keys.rewardAuthority, { owner: keys.rewardAuthority, mint: keys.mint }, 2_001);
  assert.equal(withdrawal.amount, 200);
  assert.throws(() => closeReward(ended, keys.user), /reward authority/);
  const closed = closeReward(ended, keys.rewardAuthority);
  assert.equal(closed.status, "Closed");
});

test("reward claims are one per reward-wallet, fixed amount, and cannot bypass pause or inventory", () => {
  const campaign = frozenCampaign();
  const reward = activateReward(
    fundReward(createReward(campaign, rewardInput({ maxClaims: 2 }), keys.rewardAuthority), 200, keys.rewardAuthority),
    1_200,
    keys.rewardAuthority
  );
  const ledger = new RewardLedger(reward);
  const shipped = { campaignHash: campaign.configHash, wallet: keys.user, stage: "Shipped" };
  const recipient = { owner: keys.user, mint: keys.mint };

  const claim = ledger.claim(campaign, shipped, recipient, keys.user, 1_200);
  assert.equal(claim.amount, 100);
  assert.throws(() => ledger.claim(campaign, shipped, recipient, keys.user, 1_201), /Claim PDA already exists/);
  const paused = ledger.pause(keys.rewardAuthority);
  const anotherUser = { campaignHash: campaign.configHash, wallet: keys.vault, stage: "Shipped" };
  const anotherRecipient = { owner: keys.vault, mint: keys.mint };
  assert.throws(() => ledger.claim(campaign, anotherUser, anotherRecipient, keys.vault, 1_202), /inactive/);
  assert.equal(paused.status, "Paused");
});
