import { db } from "@/src/prisma/db";
import { toInstant } from "@/src/prisma/codecs";
import { createHash, randomInt } from "node:crypto";

export interface CreateOtpInput {
  email: string;
  ip?: string;
}

export async function createOtp(input: CreateOtpInput) {
  const email = input.email.toLowerCase().trim();
  const ttlMin = Number(process.env.CLINIC_OTP_TTL_MIN ?? 10);
  // Crypto-random: `Math.random` is not predictable enough for a login factor.
  const code = String(randomInt(100000, 1000000));
  const codeHash = hashCode(code);
  const expiresAt = toInstant(Date.now() + ttlMin * 60 * 1000);
  const row = await db.orm.public.ClinicOtp.create({
    email,
    purpose: "LOGIN",
    codeHash,
    expiresAt,
    attempts: 0,
    ip: input.ip ?? null,
  });
  return { row, code };
}

export async function verifyOtp(email: string, code: string) {
  const emailNorm = email.toLowerCase().trim();
  const maxAttempts = Number(process.env.CLINIC_OTP_MAX_ATTEMPTS ?? 5);

  // Latest unconsumed challenge for this email; `consumedAt` is filtered in
  // memory because the fluent API has no "column is null" shorthand.
  const row = await db.orm.public.ClinicOtp
    .where({ email: emailNorm, purpose: "LOGIN" })
    .orderBy((otp) => otp.createdAt.desc())
    .first();

  if (!row || row.consumedAt) return { ok: false, reason: "invalid_or_expired" };
  if (new Date(String(row.expiresAt)) < new Date()) return { ok: false, reason: "expired" };
  if ((row.attempts ?? 0) >= maxAttempts) return { ok: false, reason: "too_many_attempts" };

  if (row.codeHash !== hashCode(code)) {
    await db.orm.public.ClinicOtp.where({ id: row.id }).update({ attempts: (row.attempts ?? 0) + 1 });
    return { ok: false, reason: "wrong_code" };
  }

  await db.orm.public.ClinicOtp.where({ id: row.id }).update({ consumedAt: toInstant(new Date()) });
  return { ok: true, email: row.email };
}

/**
 * Codes are stored hashed, so a database leak cannot be replayed as a login.
 * The HMAC key is required: without it an attacker could brute-force offline.
 */
function hashCode(code: string): string {
  const secret = process.env.CLINIC_SESSION_SECRET;
  if (!secret) throw new Error("CLINIC_SESSION_SECRET is not configured");
  return createHash("sha256").update(`${code}:${secret}`).digest("hex");
}
