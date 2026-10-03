import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type ClientLeadType = "app-demo" | "website-quote" | "clinic-claim" | "contact";

/**
 * `Lead.type` is a `text` column in the contract, so the allowed values are a
 * local union rather than a generated enum.
 */
type LeadTypeValue = "APP_DEMO" | "WEBSITE_QUOTE" | "CLINIC_CLAIM" | "CONTACT";

interface LeadPayload {
  type: ClientLeadType;
  clinicName?: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  message?: string;
  locale?: string;
}

const typeMap: Record<ClientLeadType, LeadTypeValue> = {
  "app-demo": "APP_DEMO",
  "website-quote": "WEBSITE_QUOTE",
  "clinic-claim": "CLINIC_CLAIM",
  contact: "CONTACT",
};

export async function POST(request: Request) {
  let body: LeadPayload;
  try {
    body = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const validTypes: ClientLeadType[] = ["app-demo", "website-quote", "clinic-claim", "contact"];
  if (!validTypes.includes(body.type) || !body.email || !body.name) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 422 });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email);
  if (!emailOk) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 422 });
  }

  let leadId: string | undefined;

  // Persist to database via Prisma if available
  if (process.env.DATABASE_URL) {
    try {
      const record = await prisma.orm.public.Lead.create({
        type: typeMap[body.type],
        clinicName: body.clinicName ?? null,
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        city: body.city ?? null,
        message: body.message ?? null,
        locale: body.locale ?? "fr",
      });
      leadId = record.id;
    } catch (dbError) {
      console.error("[leads] Failed to persist lead to Prisma:", dbError);
    }
  }

  console.log("[lead captured]", JSON.stringify({ ...body, leadId, timestamp: new Date().toISOString() }));

  return NextResponse.json({ ok: true, leadId });
}
