import { mkdirSync, writeFileSync } from "node:fs";
import { configHash } from "../src/protocol.js";
import { campaignFixture } from "../src/fixtures.js";

mkdirSync("dist", { recursive: true });
writeFileSync("dist/build.json", JSON.stringify({
  name: "builderloop-local-protocol-model",
  configHash: configHash(campaignFixture()),
  generatedAt: new Date(0).toISOString()
}, null, 2) + "\n");
