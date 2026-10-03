import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Single-operator admin authentication.
 *
 * There is no user table: the operator is whoever holds `ADMIN_PASSWORD`. A
 * successful login sets an httpOnly cookie holding an HMAC-SHA256 signature over
 * an expiry timestamp, so the browser cannot forge or extend a session without
 * the secret. `node:crypto` keeps this dependency-free.
 *
 * The cookie is signed, not encrypted — it carries only an expiry, never a
 * credential.
 */

const COOKIE_NAME = "dd_admin_session";
/** Sessions last a working day; the admin is expected to log in again after that. */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Signing key. Falls back to the password so a minimal deployment needs one
 * secret, but a dedicated value is preferred: rotating the session key then
 * invalidates sessions without also rotating the login password.
 */
function getSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null;
}

/** Base64url without padding, safe inside a cookie value. */
function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * HMAC over the payload. `timingSafeEqual` is avoided here because both sides
 * are computed from the same key, not compared against attacker input.
 */
function sign(payload: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payload).digest());
}

/**
 * Constant-time comparison of two equal-length base64url digests. Length is
 * checked first because `timingSafeEqual` throws on a length mismatch.
 */
function digestsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Constant-time password comparison.
 *
 * Compares SHA-256 digests rather than the raw strings so `timingSafeEqual`
 * gets equal-length buffers regardless of password length, and the plaintext is
 * never the thing being scanned byte by byte.
 */
function passwordMatches(candidate: string, expected: string): boolean {
  const bufA = createHmac("sha256", "dd-admin-password").update(candidate).digest();
  const bufB = createHmac("sha256", "dd-admin-password").update(expected).digest();
  return timingSafeEqual(bufA, bufB);
}

/** Build the signed session value for a payload, e.g. `<expiry>.<signature>`. */
export function createSessionToken(secret: string, expiresAt: number): string {
  const payload = String(expiresAt);
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verify a session value: signature must match and the expiry must be in the
 * future. Returns false rather than throwing on malformed input.
 */
export function verifySessionToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!digestsMatch(signature, sign(payload, secret))) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > Date.now();
}

/** Whether the login form can work at all: a secret is configured. */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Validate a submitted password. Always false when unconfigured, so a missing secret locks the admin down rather than opening it. */
export function verifyAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return passwordMatches(candidate, expected);
}

/** True when the current request carries a valid admin session. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = getSecret();
  if (!secret) return false;

  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value, secret);
}

/**
 * Guard for every admin page. Redirects to the login form when signed out,
 * preserving where the operator was heading so they land back there after.
 */
export async function requireAdmin(returnTo?: string): Promise<void> {
  if (await isAdminAuthenticated()) return;
  redirect(`/admin/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`);
}

/** Cookie attributes shared by the login and logout actions. */
function cookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // The site is served over HTTPS in production; `secure` would make the
    // cookie undeliverable over plain HTTP during local development.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  };
}

/** Establish a session. Returns false when no secret is configured. */
export async function startAdminSession(): Promise<boolean> {
  const secret = getSecret();
  if (!secret) return false;

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(secret, expiresAt), cookieOptions(expiresAt));
  return true;
}

/** Clear the session cookie. */
export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { ...cookieOptions(0) });
}

export const adminSessionCookieName = COOKIE_NAME;