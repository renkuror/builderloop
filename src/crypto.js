import { createHash } from "node:crypto";
import { HASH_RE, PUBKEY_RE, ZERO32 } from "./constants.js";

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function assertPubkey(value, name) {
  if (typeof value !== "string" || !PUBKEY_RE.test(value)) {
    throw new Error(`${name} must be a non-default Solana-like public key`);
  }
  if (publicKeyBytes(value).every((byte) => byte === 0)) {
    throw new Error(`${name} must be non-default`);
  }
  return value;
}

/** Decodes a canonical 32-byte Solana base58 public key without third-party dependencies. */
export function publicKeyBytes(value) {
  if (typeof value !== "string" || !PUBKEY_RE.test(value)) {
    throw new Error("public key must be base58");
  }
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = [0];
  for (const character of value) {
    let carry = alphabet.indexOf(character);
    if (carry < 0) throw new Error("public key contains invalid base58 character");
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] * 58;
      digits[index] = carry & 0xff;
      carry >>>= 8;
    }
    while (carry > 0) {
      digits.push(carry & 0xff);
      carry >>>= 8;
    }
  }
  for (let index = 0; index < value.length - 1 && value[index] === "1"; index += 1) {
    digits.push(0);
  }
  const bytes = Uint8Array.from(digits.reverse());
  if (bytes.length !== 32) throw new Error("public key must decode to exactly 32 bytes");
  return bytes;
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
