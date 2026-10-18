import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/prisma/db";
import { createOtp } from "@/lib/repositories/clinic-otp";
import { sendClinicOtpEmail } from "@/lib/services/email";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Bounds how often one caller — and one address — can trigger an OTP email.
 * Both windows matter: the per-caller one stops a single client hammering the
 * endpoint, the per-address one stops a distributed client from mail-bombing a
 * single clinic or walking the address space.
 */
const perCaller = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });
const perEmail = createRateLimiter({ limit: 3, windowMs: 15 * 60 * 1000 });

/**
 * Neutral body for every accepted request.
 *
 * Identical whether or not the address is registered, and whether or not the
 * send succeeded: a differing response would turn this endpoint into an
 * account-enumeration oracle. Send failures are logged, not surfaced.
 */
const ACCEPTED = {
  ok: true,
  sent: true,
  message: "Si un cabinet correspond à cet email, un code vient d'être envoyé.",
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String((body as Record<string, unknown>)?.email || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  if (!perCaller.check(clientKey(req)).allowed || !perEmail.check(email).allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const clinic = await db.orm.public.Clinic.where({ email }).first();
  // Unknown address: answer exactly as if a code had been sent.
  if (!clinic) return NextResponse.json(ACCEPTED);

  const dryRun =
    process.env.NODE_ENV !== "production" &&
    !process.env.MAILTRAP_API_TOKEN &&
    !process.env.MAILTRAP_USERNAME;

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
  const { code } = await createOtp({ email, ip });
  const res = await sendClinicOtpEmail(email, code);
  if (!res.ok) console.error("[otp] send failed", { email, error: res.error });

  // In dry-run the code is returned so local development works without a mail
  // provider. Never in production: this branch is only reached for known
  // addresses, so the code must not ride along with the neutral body.
  return NextResponse.json({ ...ACCEPTED, ...(dryRun ? { code } : {}) });
}
