import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("three-screen frontend is wallet-connected and reads actual program accounts", () => {
  const html = readFileSync("web/index.html", "utf8");
  const client = readFileSync("web/app.js", "utf8");
  for (const screen of ['id="campaign"', 'id="progress"', 'id="reward"']) assert.match(html, new RegExp(screen));
  assert.match(client, /window\.solana\.connect/);
  assert.match(client, /getAccountInfo/);
  assert.match(client, /findProgramAddressSync/);
  assert.match(client, /claim_reward/);
  assert.doesNotMatch(html, /leaderboard|referral|Sybil resistance/i);
});
