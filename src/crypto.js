import { createHash } from "node:crypto";
import { HASH_RE, PUBKEY_RE, ZERO32 } from "./constants.js";

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function assertPubkey(value, name) {
  if (typeof value !== "string" || !PUBKEY_RE.test(value)) {
    throw new Error(`${name} must be a non-default Solana-like public key`);
  }
  return value;
}

export function assertHash(value, name, { allowZero = false } = {}) {
  if (typeof value !== "string" || !HASH_RE.test(value)) {
    throw new Error(`${name} must be a 32-byte lowercase hex hash`);
  }
  if (!allowZero && value === ZERO32) {
    throw new Error(`${name} must be nonzero`);
  }
  return value;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashObject(domain, value) {
  return sha256Hex(`${domain}\n${canonicalJson(value)}`);
}
