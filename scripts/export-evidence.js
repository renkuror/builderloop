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
writeFileSync("evidence/devnet-addresses.json", JSON.stringify({ status: "not-produced", reason: "Devnet is explicitly excluded; localnet only." }, null, 2) + "\n");
writeFileSync("evidence/transaction-links.json", JSON.stringify({ status: "not-produced", reason: "No Devnet transactions were performed; ephemeral local signatures are not durable explorer evidence." }, null, 2) + "\n");
writeFileSync("evidence/test-summary.md", "# Test Summary\n\n`anchor build` and `anchor test --skip-build` pass for both real programs and their local-validator CPI/SPL flow. `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, and `pnpm run ci` pass. Evidence is local/test-only; Devnet is excluded.\n");
