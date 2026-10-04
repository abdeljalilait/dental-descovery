#!/usr/bin/env node

/**
 * Dentora - Clinic Outreach List
 *
 * Exports a campaign list from the synced clinics so Dental App accounts can be
 * offered to practices that are not on the platform yet. WhatsApp is the primary
 * channel (Morocco), so every row gets a ready-to-use wa.me deep link; email is
 * included where a public address was found on the clinic website.
 *
 * Usage:
 *   node scripts/export-outreach-list.mjs
 *   node scripts/export-outreach-list.mjs --city=casablanca
 *   node scripts/export-outreach-list.mjs --not-contacted
 *   node scripts/export-outreach-list.mjs --out=outreach/casablanca.csv
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Placeholder numbers that must never be dialled or messaged.
 * `212600000000` was fabricated by an earlier version of the phone normaliser,
 * and `2126000000NN` came from the hand-written seed data.
 */
const PLACEHOLDER = /^(?:212)?(?:6000000\d{2,3}|522000000)$/;

/**
 * Normalise a Moroccan phone number to E.164 for wa.me links.
 * Handles "06 20 65 54 55", "00212620655455", "+212 6 20 65 54 55" and rejects
 * masked ("+212 539 XXX XXX") or placeholder numbers, which cannot be dialled.
 */
function toWhatsApp(raw) {
  if (!raw) return { e164: "", link: "", dialable: false };
  if (/X{2,}/i.test(raw)) return { e164: "", link: "", dialable: false };

  const digits = raw.replace(/\D/g, "");
  if (PLACEHOLDER.test(digits.replace(/^0/, ""))) {
    return { e164: "", link: "", dialable: false };
  }

  let national = digits;
  if (national.startsWith("00212")) national = national.slice(5);
  else if (national.startsWith("212")) national = national.slice(3);
  if (national.startsWith("0")) national = national.slice(1);

  // Moroccan mobiles only: 06/07 prefixes, 8 remaining digits.
  if (!/^[67]/.test(national) || national.length !== 9) {
    return { e164: "", link: "", dialable: false };
  }

  const e164 = `+212${national}`;
  return { e164, link: `https://wa.me/${e164.replace(/\D/g, "")}`, dialable: true };
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value).replace(/\r?\n/g, " ");
  return /[",;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, headers) {
  const head = headers.map((h) => csvCell(h.label)).join(",");
  const body = rows.map((row) => headers.map((h) => csvCell(h.get(row))).join(","));
  return [head, ...body].join("\n");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[OUTREACH] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const { db } = await import("../src/prisma/db.ts");

  const cityFilter = flag("city");
  const onlyNotContacted = args.includes("--not-contacted");

  // Specialty slugs live on the junction table, so pull the relation in.
  const clinics = await db.orm.public.Clinic.include("specialties", (rows) =>
    rows.include("specialty")
  ).all();

  const outreachRows = await db.orm.public.ClinicOutreach.all();
  const alreadyContacted = new Set(
    outreachRows.filter((o) => o.status === "SENT" || o.status === "REPLIED").map((o) => o.clinicId)
  );

  const { cities } = await import("../lib/data/cities.ts");
  const cityNames = new Map(cities.map((c) => [c.slug, c.name]));

  let rows = clinics.filter((c) => !c.usesApp);
  if (cityFilter) rows = rows.filter((c) => c.citySlug === cityFilter);
  if (onlyNotContacted) rows = rows.filter((c) => !alreadyContacted.has(c.id));

  const enriched = rows.map((clinic) => {
    const wa = toWhatsApp(clinic.whatsapp || clinic.phone);
    return {
      clinic,
      wa,
      city: cityNames.get(clinic.citySlug) || clinic.citySlug,
      url: `${SITE_URL}/fr/dentistes/${clinic.citySlug}/${clinic.slug}`,
    };
  });

  const headers = [
    { label: "clinic", get: (r) => r.clinic.name },
    { label: "city", get: (r) => r.city },
    { label: "whatsapp_e164", get: (r) => r.wa.e164 },
    { label: "whatsapp_link", get: (r) => r.wa.link },
    { label: "phone_raw", get: (r) => r.clinic.phone },
    { label: "email", get: (r) => r.clinic.email },
    { label: "email_source", get: (r) => r.clinic.emailSource },
    { label: "website", get: (r) => r.clinic.website },
    { label: "rating", get: (r) => r.clinic.rating },
    { label: "reviews", get: (r) => r.clinic.reviewCount },
    { label: "address", get: (r) => r.clinic.addressFr },
    { label: "neighborhood", get: (r) => r.clinic.neighborhoodFr },
    { label: "specialties", get: (r) => r.clinic.specialties.map((l) => l.specialty?.slug ?? l.specialtyId).join(" ") },
    { label: "profile_url", get: (r) => r.url },
    { label: "uses_app", get: (r) => (r.clinic.usesApp ? "yes" : "no") },
    { label: "claimed", get: (r) => (r.clinic.claimed ? "yes" : "no") },
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = cityFilter ? `-${cityFilter}` : "-all";
  const outFile = path.resolve(
    rootDir,
    flag("out") || path.join("outreach", `clinics${suffix}-${stamp}.csv`)
  );
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, toCsv(enriched, headers), "utf8");

  const dialable = enriched.filter((r) => r.wa.dialable).length;
  const withEmail = enriched.filter((r) => r.clinic.email).length;
  const bothChannels = enriched.filter((r) => r.wa.dialable && r.clinic.email).length;

  console.log("[OUTREACH] candidates (excluding clinics already on the app):", enriched.length);
  console.log("[OUTREACH] WhatsApp number usable  :", dialable, `(${Math.round((100 * dialable) / (enriched.length || 1))}%)`);
  console.log("[OUTREACH] email available        :", withEmail, `(${Math.round((100 * withEmail) / (enriched.length || 1))}%)`);
  console.log("[OUTREACH] reachable on both      :", bothChannels);
  console.log("[OUTREACH] CSV written to          :", path.relative(rootDir, outFile));

  await db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("[OUTREACH] failed:", err);
  process.exit(1);
});