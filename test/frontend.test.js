import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("judge frontend preserves local wallet actions and exposes the complete read-only route set", () => {
  const html = readFileSync("web/index.html", "utf8");
  const client = readFileSync("web/app.js", "utf8");
  const ui = readFileSync("web/ui.js", "utf8");
  assert.match(html, /id="app"/);
  assert.match(html, /src="\/app\.js"/);
  for (const path of ['path: "/"', 'path: "/demo"', 'path: "/campaign"', 'path: "/progress"', 'path: "/reward"', 'path: "/architecture"', 'path: "/evidence"']) assert.match(ui, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(client, /window\.solana\.connect/);
  assert.match(client, /getAccountInfo/);
  assert.match(client, /findProgramAddressSync/);
  assert.match(client, /claim_reward/);
  assert.match(ui, /DEMO FIXTURE — NOT LIVE/);
  assert.match(client, /not a claim of Sybil resistance/);
  assert.doesNotMatch(client, /leaderboard|referral/i);
});
