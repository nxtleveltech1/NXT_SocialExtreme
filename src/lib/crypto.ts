import { env } from "@/lib/env";
import crypto from "node:crypto";

const VERSION_PREFIX = "v1";

function parseKey(raw: string): Buffer {
  // Allow either base64 (preferred) or hex.
  const b64 = /^[A-Za-z0-9+/=]+$/;
  const hex = /^[0-9a-fA-F]+$/;

  let buf: Buffer | null = null;
  if (hex.test(raw) && raw.length % 2 === 0) {
    buf = Buffer.from(raw, "hex");
  } else if (b64.test(raw)) {
    try {
      buf = Buffer.from(raw, "base64");
    } catch {
      buf = null;
    }
  }

  if (!buf) throw new Error("Invalid TOKEN_ENCRYPTION_KEY format (use base64 or hex).");
  if (buf.length !== 32) {
    throw new Error(
      `Invalid TOKEN_ENCRYPTION_KEY length: expected 32 bytes, got ${buf.length}.`
    );
  }
  return buf;
}

const KEY = parseKey(env.TOKEN_ENCRYPTION_KEY);

/**
 * Encrypt a secret using AES-256-GCM.
 *
 * Output format:
 *   v1:<base64(iv)>:<base64(tag)>:<base64(ciphertext)>
 */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION_PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Decrypt a secret previously encrypted by encryptSecret().
 *
 * Backwards compatibility:
 * - If the input is not in the expected format, we return it as-is.
 *   This allows a gradual migration from legacy plaintext token storage.
 */
export function decryptSecret(value: string): string {
  const parts = value.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) return value;

  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ciphertext = Buffer.from(parts[3], "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}





