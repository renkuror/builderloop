#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { attestationHash, configHash, projectId } from "../src/protocol.js";
import { campaignFixture, hashFixture, keys } from "../src/fixtures.js";

const command = process.argv[2];

if (command === "campaign-hash") {
  console.log(configHash(campaignFixture()));
} else if (command === "issue-module") {
  const seed = hashFixture(process.argv[3] ?? "project-seed");
  const payload = {
    builderloopProgramId: keys.program,
    campaign: keys.authority,
    user: keys.user,
    verifierEpoch: campaignFixture().verifierEpoch,
    eventIdHash: hashFixture("event-1"),
    projectId: projectId({ programId: keys.program, campaign: keys.authority, user: keys.user, projectSeedHash: seed }),
    projectSeedHash: seed,
    metadataHash: hashFixture("metadata"),
    expiresAt: 10_000
  };
  console.log(JSON.stringify({ ...payload, attestationHash: attestationHash(payload) }, null, 2));
} else if (command === "inspect-module") {
  const path = process.argv[3];
  const payload = JSON.parse(readFileSync(path, "utf8"));
  console.log(JSON.stringify({ attestationHash: attestationHash(payload), projectId: payload.projectId }, null, 2));
} else {
  console.error("Usage: builderloop <campaign-hash|issue-module|inspect-module>");
  process.exit(1);
}
