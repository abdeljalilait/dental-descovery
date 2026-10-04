import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/src/prisma/db";
import { toInstant } from "@/src/prisma/codecs";

/**
 * Kapso / Meta WhatsApp delivery receipts.
 *
 * Kapso relays Meta's status callbacks here. Each `messages.*` status event
 * carries the message id returned at send time, which is what
 * `clinic_outreach.providerMessageId` stores, so the admin progress panel can
 * report how many campaigns were actually delivered rather than only accepted.
 *
 * Auth is a shared secret in the query string, matching how Meta configures the
 * callback URL (`?hub.challenge` also goes through the same check).
 */

interface KapsoStatusValue {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: { code?: number; title?: string }[];
}

interface KapsoWebhookBody {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        statuses?: KapsoStatusValue[];
      };
    }[];
  }[];
}

function isAuthorized(request: Request, url: URL): boolean {
  const secret = process.env.KAPSO_WEBHOOK_SECRET;
  // Fail closed: without a configured secret the endpoint must not be open,
  // otherwise anyone could mark arbitrary campaigns as delivered.
  if (!secret) return false;

  const provided =
    request.headers.get("x-kapso-signature") ?? url.searchParams.get("token") ?? "";
  const expected = secret;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Meta maps onto our outreach statuses; unknown values are ignored. */
function mapStatus(status: string | undefined): string | null {
  switch (status) {
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "failed":
    case "undelivered":
      return "FAILED";
    default:
      return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (!isAuthorized(request, url)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const url = new URL(request.url);

  if (!isAuthorized(request, url)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: KapsoWebhookBody;
  try {
    body = (await request.json()) as KapsoWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const statuses = (body.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.statuses ?? []),
  );

  let updated = 0;

  for (const status of statuses) {
    const messageId = status.id;
    const nextStatus = mapStatus(status.status);
    if (!messageId || !nextStatus) continue;

    const row = await db.orm.public.ClinicOutreach
      .where({ providerMessageId: messageId })
      .first();
    if (!row) continue;

    // The temporal codec writes `timestamptz` as Temporal.Instant.
    const now = toInstant(new Date());
    await db.orm.public.ClinicOutreach
      .where({ id: row.id })
      .update({
        status: nextStatus,
        // Only the first transition stamps delivery, so a later read receipt
        // does not overwrite it.
        deliveredAt: nextStatus === "DELIVERED" && !row.deliveredAt ? now : undefined,
        failedAt: nextStatus === "FAILED" ? now : undefined,
        note:
          nextStatus === "FAILED" && status.errors?.[0]?.title
            ? `${nextStatus}: ${status.errors[0].title}`
            : undefined,
      });
    updated++;
  }

  return NextResponse.json({ ok: true, updated });
}