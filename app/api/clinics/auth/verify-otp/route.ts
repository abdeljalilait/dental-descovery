import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/repositories/clinic-otp";
import { createClinicSession } from "@/lib/clinic-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const email = String(b.email || "").toLowerCase().trim();
  const code = String(b.code || "").trim();
  if (!email || !code) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  const res = await verifyOtp(email, code);
  if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 401 });
  await createClinicSession(email);
  return NextResponse.json({ ok: true });
}
