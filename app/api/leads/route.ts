import { NextResponse } from "next/server";

type LeadType = "app-demo" | "website-quote" | "clinic-claim" | "contact";

interface LeadPayload {
  type: LeadType;
  clinicName?: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  message?: string;
  locale?: string;
}

const leads: LeadPayload[] = [];

export async function POST(request: Request) {
  let body: LeadPayload;
  try {
    body = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const validTypes: LeadType[] = ["app-demo", "website-quote", "clinic-claim", "contact"];
  if (!validTypes.includes(body.type) || !body.email || !body.name) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 422 });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email);
  if (!emailOk) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 422 });
  }

  const lead = { ...body, receivedAt: new Date().toISOString() };
  leads.push(lead);
  console.log("[lead]", JSON.stringify(lead));

  return NextResponse.json({ ok: true });
}
