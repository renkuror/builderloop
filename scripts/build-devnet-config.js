import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const FALLBACK_RPC = "https://api.devnet.solana.com";
const DEFAULT_BUILDERLOOP = "3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2";
const DEFAULT_COHORT_BUILD = "BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF";
const deployment = JSON.parse(readFileSync("deployments/devnet.json", "utf8"));

const cluster = process.env.PUBLIC_SOLANA_CLUSTER ?? deployment.cluster ?? "devnet";
if (cluster !== "devnet") throw new Error("BuilderLoop's public release build only supports Devnet.");

const config = {
  cluster,
  rpcUrl: process.env.PUBLIC_SOLANA_RPC_URL ?? deployment.rpcUrl ?? FALLBACK_RPC,
  live: deployment.status === "deployed",
  builderloopProgramId: process.env.PUBLIC_BUILDERLOOP_PROGRAM_ID ?? deployment.programs?.builderloop?.address ?? DEFAULT_BUILDERLOOP,
  cohortBuildProgramId: process.env.PUBLIC_COHORTBUILD_PROGRAM_ID ?? deployment.programs?.cohortBuild?.address ?? DEFAULT_COHORT_BUILD,
  demo: deployment.demo?.status === "complete" ? deployment.demo : null,
};

if (!config.rpcUrl.startsWith("https://")) throw new Error("PUBLIC_SOLANA_RPC_URL must use HTTPS.");

mkdirSync("dist/web", { recursive: true });
writeFileSync(
  "dist/web/devnet-config.js",
  `globalThis.BUILDERLOOP_PUBLIC_CONFIG = Object.freeze(${JSON.stringify(config)});\n`,
);
