import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/prisma/db";
import { createOtp } from "@/lib/repositories/clinic-otp";
import { sendClinicOtpEmail } from "@/lib/services/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = String((body as Record<string, unknown>)?.email || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  const clinic = await db.orm.public.Clinic.where({ email }).first();
  if (!clinic) {
    return NextResponse.json(
      { error: "Aucun cabinet trouvé avec cet email. Contactez-nous pour corriger votre email.", contact: true },
      { status: 404 }
    );
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
  const { code } = await createOtp({ email, ip });
  const res = await sendClinicOtpEmail(email, code);
  const dryRun = process.env.NODE_ENV !== "production" && !process.env.MAILTRAP_API_TOKEN && !process.env.MAILTRAP_USERNAME;
  return NextResponse.json({
    ok: true,
    sent: res.ok,
    message: res.ok ? "Code envoyé" : res.error || "Échec d'envoi",
    ...(dryRun ? { code } : {}),
  });
}
