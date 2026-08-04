import { mkdirSync, writeFileSync } from "node:fs";
import { attestationHash, configHash, projectId } from "../src/protocol.js";
import { campaignFixture, hashFixture, keys } from "../src/fixtures.js";

const campaign = campaignFixture();
const frozenHash = configHash(campaign);
const seed = hashFixture("project-seed");
const module = {
  builderloopProgramId: keys.program,
  campaign: keys.authority,
  user: keys.user,
  verifierEpoch: campaign.verifierEpoch,
  eventIdHash: hashFixture("event-1"),
  projectId: projectId({ programId: keys.program, campaign: keys.authority, user: keys.user, projectSeedHash: seed }),
  projectSeedHash: seed,
  metadataHash: hashFixture("metadata"),
  expiresAt: 10_000
};

mkdirSync("evidence", { recursive: true });
writeFileSync("evidence/campaign-config.json", JSON.stringify(campaign, null, 2) + "\n");
writeFileSync("evidence/config-hash.txt", `${frozenHash}\n`);
writeFileSync("evidence/module-attestation.json", JSON.stringify({ ...module, attestationHash: attestationHash(module) }, null, 2) + "\n");
writeFileSync("evidence/canonicalization-vectors.json", JSON.stringify({
  configHash: frozenHash,
  projectId: module.projectId,
  attestationHash: attestationHash(module)
}, null, 2) + "\n");
writeFileSync("evidence/devnet-addresses.json", JSON.stringify({ status: "not-executed", label: "POST-AUDIT PHASE", reason: "Devnet deployment is intentionally excluded from this run." }, null, 2) + "\n");
writeFileSync("evidence/transaction-links.json", JSON.stringify({ status: "not-executed", label: "POST-AUDIT PHASE", reason: "No public-network transaction was performed; Devnet is intentionally excluded." }, null, 2) + "\n");
writeFileSync("evidence/test-summary.md", "# Test Summary\n\nLocal Node protocol tests are executable evidence for the JavaScript model only. They do not substitute for Anchor, local-validator, CPI, or SPL-token verification. Devnet deployment is intentionally excluded from this run.\n");
