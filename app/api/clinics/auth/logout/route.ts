import { NextResponse } from "next/server";
import { clearClinicSession } from "@/lib/clinic-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearClinicSession();
  return NextResponse.json({ ok: true });
}
