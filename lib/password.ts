import crypto from "crypto";
import { execute, queryOne } from "./db";

const SCRYPT_PREFIX = "scrypt$";
const SCRYPT_KEYLEN = 64;
const STUDENT_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${SCRYPT_PREFIX}${salt}$${derived}`;
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function verifyPassword(
  password: string,
  stored: string,
): { valid: boolean; needsUpgrade: boolean } {
  if (!stored) return { valid: false, needsUpgrade: false };
  if (stored.startsWith(SCRYPT_PREFIX)) {
    const parts = stored.split("$");
    if (parts.length !== 3) return { valid: false, needsUpgrade: false };
    const [, salt, expectedHex] = parts;
    if (!salt || !expectedHex || !/^[a-f0-9]+$/i.test(expectedHex))
      return { valid: false, needsUpgrade: false };
    const expected = Buffer.from(expectedHex, "hex");
    const derived = crypto.scryptSync(password, salt, expected.length);
    return {
      valid:
        derived.length === expected.length &&
        crypto.timingSafeEqual(derived, expected),
      needsUpgrade: false,
    };
  }
  return { valid: timingSafeTextEqual(password, stored), needsUpgrade: true };
}

export function generateStudentPassword(length = 10): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += STUDENT_PASSWORD_ALPHABET[bytes[i] % STUDENT_PASSWORD_ALPHABET.length];
  }
  return out;
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 20;

function loginLimitKey(scope: string, identifier: string): string {
  return `login:${scope}:${sha256Hex(identifier.toLowerCase()).slice(0, 24)}`;
}

export async function isLoginRateLimited(
  scope: string,
  identifier: string,
): Promise<boolean> {
  const key = loginLimitKey(scope, identifier);
  const win = Math.floor(Date.now() / LOGIN_WINDOW_MS);
  const row = await queryOne<{ window: number; count: number }>(
    "SELECT window, count FROM mcp_limits WHERE key=?",
    [key],
  );
  return (
    !!row && Number(row.window) === win && Number(row.count) >= LOGIN_MAX_FAILURES
  );
}

export async function recordLoginFailure(
  scope: string,
  identifier: string,
): Promise<void> {
  const key = loginLimitKey(scope, identifier);
  const win = Math.floor(Date.now() / LOGIN_WINDOW_MS);
  await execute(
    `INSERT INTO mcp_limits(key, window, count) VALUES(?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN mcp_limits.window = excluded.window THEN mcp_limits.count + 1 ELSE 1 END,
       window = excluded.window`,
    [key, win],
  );
}

export async function clearLoginFailures(
  scope: string,
  identifier: string,
): Promise<void> {
  const key = loginLimitKey(scope, identifier);
  await execute("DELETE FROM mcp_limits WHERE key=?", [key]);
}
