import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
if (!existsSync("evidence/devnet-addresses.json")) writeFileSync("evidence/devnet-addresses.json", JSON.stringify({ status: "not-produced", reason: "No Devnet deployment has been performed." }, null, 2) + "\n");
if (!existsSync("evidence/transaction-links.json")) writeFileSync("evidence/transaction-links.json", JSON.stringify({ status: "not-produced", reason: "No Devnet transactions have been performed." }, null, 2) + "\n");
writeFileSync("evidence/test-summary.md", "# Test Summary\n\n`anchor build` and `anchor test --skip-build` cover both real programs and their local-validator CPI/SPL flow. `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, and `pnpm run ci` cover the deterministic and frontend suites. Devnet evidence is maintained separately in `deployments/devnet.json` and the public evidence JSON files.\n");
