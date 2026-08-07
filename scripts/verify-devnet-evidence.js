import { readFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";

const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const UPGRADEABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const deployment = JSON.parse(readFileSync("deployments/devnet.json", "utf8"));
const evidence = JSON.parse(readFileSync("evidence/devnet-addresses.json", "utf8"));
const links = JSON.parse(readFileSync("evidence/transaction-links.json", "utf8"));

if (deployment.cluster !== "devnet" || deployment.status !== "deployed" || evidence.status !== "deployed" || links.status !== "deployed") {
  throw new Error("Devnet evidence is incomplete; refusing to verify a pending release.");
}
const rpcUrl = deployment.rpcUrl;
if (!rpcUrl?.includes("devnet")) throw new Error("Devnet evidence RPC is not a Devnet URL.");
const connection = new Connection(rpcUrl, "finalized");
if (await connection.getGenesisHash() !== DEVNET_GENESIS_HASH) throw new Error("Evidence RPC is not Solana Devnet.");

const programIds = Object.values(deployment.programs).map((program) => new PublicKey(program.address));
for (const programId of programIds) {
  const account = await connection.getAccountInfo(programId, "finalized");
  if (!account?.executable || !account.owner.equals(UPGRADEABLE_LOADER)) throw new Error(`Program ${programId.toBase58()} is not executable on Devnet.`);
}

const requiredTransactions = ["moduleFinalization", "nativeCpiShip", "rewardClaimed"];
for (const name of requiredTransactions) {
  const transaction = links.transactions?.[name];
  if (!transaction?.signature || !transaction.explorerUrl?.endsWith("?cluster=devnet")) throw new Error(`Missing Devnet link for ${name}.`);
  const status = await connection.getSignatureStatus(transaction.signature, { searchTransactionHistory: true });
  if (!status.value || status.value.err !== null || !status.value.confirmationStatus) throw new Error(`Devnet transaction ${name} is not confirmed without error.`);
}

const addresses = evidence.addresses;
for (const [name, value] of Object.entries(addresses)) {
  if (name === "user") continue;
  const address = new PublicKey(value.address);
  const account = await connection.getAccountInfo(address, "finalized");
  if (name === "sourceAuthority" && !account) continue;
  if (!account) throw new Error(`Evidence account ${name} is missing on Devnet.`);
  if (["mint", "recipient", "rewardVault"].includes(name) && !account.owner.equals(TOKEN_PROGRAM)) throw new Error(`Evidence token account ${name} has the wrong owner.`);
  if (["challenge", "buildSubmission", "completion"].includes(name) && !account.owner.equals(new PublicKey(deployment.programs.cohortBuild.address))) throw new Error(`Evidence CohortBuild account ${name} has the wrong owner.`);
  if (!["mint", "recipient", "rewardVault", "challenge", "buildSubmission", "completion"].includes(name) && !account.owner.equals(new PublicKey(deployment.programs.builderloop.address))) throw new Error(`Evidence BuilderLoop account ${name} has the wrong owner.`);
}

console.log(JSON.stringify({ status: "verified", cluster: "devnet", programs: deployment.programs, checkedTransactions: requiredTransactions, checkedAddresses: Object.keys(addresses) }, null, 2));
