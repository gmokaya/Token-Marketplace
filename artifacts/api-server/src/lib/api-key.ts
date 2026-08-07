/**
 * API Key generation and verification helpers.
 *
 * Keys look like:  sk_live_<43-char base64url secret>
 * Key prefix:      first 16 characters (sk_live_XXXXXXX) — stored in plain for display
 * Key hash:        SHA-256 hex of the full key — stored in the DB for verification
 *
 * The plaintext key is shown to the user exactly once (at creation time).
 * After that, only the prefix and hash are available.
 */
import { createHash, randomBytes, timingSafeEqual } from "crypto";

const ENV_PREFIX = process.env.NODE_ENV === "production" ? "live" : "test";

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const secret = randomBytes(32).toString("base64url"); // 43 chars
  const key    = `sk_${ENV_PREFIX}_${secret}`;
  const prefix = key.slice(0, 16);
  const hash   = hashKey(key);
  return { key, prefix, hash };
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Constant-time comparison of two hex hashes */
export function hashesMatch(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
