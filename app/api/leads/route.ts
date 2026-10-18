import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

type ClientLeadType = "app-demo" | "website-quote" | "clinic-claim" | "contact";

/** Caps lead-post spam per caller without blocking a genuine visitor retrying. */
const perCaller = createRateLimiter({ limit: 6, windowMs: 10 * 60 * 1000 });

/**
 * `Lead.type` is a `text` column in the contract, so the allowed values are a
 * local union rather than a generated enum.
 */
type LeadTypeValue = "APP_DEMO" | "WEBSITE_QUOTE" | "CLINIC_CLAIM" | "CONTACT";

interface LeadPayload {
  type: ClientLeadType;
  planKey?: string;
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
  if (!perCaller.check(clientKey(request)).allowed) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

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
        planKey: body.planKey ?? null,
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

  // Log the lead id and type only: the payload carries personal data (name,
  // email, phone) and stdout is not an appropriate store for it.
  console.log(
    "[lead captured]",
    JSON.stringify({
      type: body.type,
      planKey: body.planKey ?? null,
      leadId,
      timestamp: new Date().toISOString(),
    }),
  );

  return NextResponse.json({ ok: true, leadId });
}
