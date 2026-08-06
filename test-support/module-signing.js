import { generateKeyPairSync, sign } from "node:crypto";
import { base58PublicKey } from "../src/crypto.js";
import { attestationBytes } from "../src/protocol.js";

const pair = generateKeyPairSync("ed25519");
const publicDer = pair.publicKey.export({ format: "der", type: "spki" });

export const moduleTestVerifier = base58PublicKey(publicDer.subarray(-32));

export function signedVoucher(voucher) {
  const message = attestationBytes({
    builderloopProgramId: voucher.builderloopProgramId,
    campaign: voucher.campaignAuthority,
    user: voucher.user,
    verifierEpoch: voucher.verifierEpoch,
    eventIdHash: voucher.eventIdHash,
    projectId: voucher.projectId,
    projectSeedHash: voucher.projectSeedHash,
    metadataHash: voucher.metadataHash,
    expiresAt: voucher.expiresAt
  });
  return { ...voucher, signature: sign(null, message, pair.privateKey).toString("base64") };
}
