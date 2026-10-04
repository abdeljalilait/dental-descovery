import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const CLINIC_COOKIE = "dd_clinic_session";

/**
 * No development fallback: a hardcoded secret would let anyone forge a clinic
 * session in production. A missing secret fails the login closed instead.
 */
function secret(): string {
  const value = process.env.CLINIC_SESSION_SECRET;
  if (!value) throw new Error("CLINIC_SESSION_SECRET is not configured");
  return value;
}

export interface ClinicSession {
  email: string;
  expiresAt: number;
}

export async function createClinicSession(email: string): Promise<void> {
  const emailNorm = email.toLowerCase().trim();
  if (!process.env.CLINIC_SESSION_SECRET) {
    throw new Error("CLINIC_SESSION_SECRET is not configured");
  }
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7d
  const payload = `${emailNorm}|${expiresAt}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  const value = `${payload}|${sig}`;
  const jar = await cookies();
  jar.set(CLINIC_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getClinicSession(): Promise<ClinicSession | null> {
  const jar = await cookies();
  const raw = jar.get(CLINIC_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split("|");
  if (parts.length !== 3) return null;
  const [email, expStr, sig] = parts;
  const expiresAt = Number(expStr);
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return null;
  const payload = `${email}|${expStr}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return { email: email.toLowerCase(), expiresAt };
}

export async function clearClinicSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(CLINIC_COOKIE);
}
