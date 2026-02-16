import { env } from "@/lib/env";
import crypto from "node:crypto";

function parseKey(raw: string): Buffer {
  // Accept base64 (preferred) or hex (32 bytes).
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

  if (!buf || buf.length !== 32) {
    throw new Error("Invalid TOKEN_ENCRYPTION_KEY (must be 32 bytes, base64 or hex).");
  }
  return buf;
}

let _cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (!_cachedKey) {
    const raw = env.TOKEN_ENCRYPTION_KEY;
    if (!raw) {
      throw new Error(
        "TOKEN_ENCRYPTION_KEY is not set. Add it to your .env.local (or Vercel project env) to use OAuth state signing."
      );
    }
    _cachedKey = parseKey(raw);
  }
  return _cachedKey;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64");
}

function sign(data: string): string {
  const mac = crypto.createHmac("sha256", getKey()).update(data, "utf8").digest();
  return base64UrlEncode(mac);
}

export type OAuthStatePayload = {
  channelId: number;
  userId: string;
  provider: "meta" | "tiktok";
  exp: number; // epoch seconds
};

export function createOAuthState(
  payload: Omit<OAuthStatePayload, "exp">,
  ttlSeconds = 10 * 60
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body: OAuthStatePayload = { ...payload, exp };
  const encoded = base64UrlEncode(Buffer.from(JSON.stringify(body), "utf8"));
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const [encoded, sig] = state.split(".");
  if (!encoded || !sig) throw new Error("Invalid OAuth state.");

  const expected = sign(encoded);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid OAuth state signature.");
  }

  const payload = JSON.parse(base64UrlDecode(encoded).toString("utf8")) as OAuthStatePayload;
  if (!payload?.exp || typeof payload.exp !== "number") throw new Error("Invalid OAuth state.");
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("OAuth state expired.");
  return payload;
}


