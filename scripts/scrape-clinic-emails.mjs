#!/usr/bin/env node

/**
 * Dental Discovery - Clinic Contact Enrichment
 *
 * Google Maps never exposes email addresses, so the only source is the clinic
 * website recorded during the SerpApi sync. This walks each clinic site
 * (homepage + contact page), pulls out addresses and stores the best candidate
 * on `Clinic.email`.
 *
 * This costs no SerpApi quota - it only fetches the websites already stored.
 *
 * Usage:
 *   node scripts/scrape-clinic-emails.mjs
 *   node scripts/scrape-clinic-emails.mjs --limit=20
 *   node scripts/scrape-clinic-emails.mjs --dry-run
 */

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
const DRY_RUN = args.includes("--dry-run");
const LIMIT = flag("limit") ? Number(flag("limit")) : undefined;

const USER_AGENT = "DentalDiscoveryBot/1.0 (clinic contact enrichment)";
const FETCH_TIMEOUT_MS = 12000;
const REQUEST_DELAY_MS = 400;
const CONCURRENCY = 4;
const CONTACT_PATHS = ["/", "/contact", "/contactez-nous", "/a-propos", "/equipe"];

/** Addresses that are asset filenames, error codes, or vendor noise. */
const JUNK = [
  /\.(png|jpe?g|gif|svg|webp|css|js)$/i,
  /@(sentry|wixpress|example|domain|yourdomain|email|test)\./i,
  /@(company|yourcompany|yourbusiness)\./i,
  /^[^@]+@(2x|localhost)/i,
  /\b(noreply|no-reply|donotreply|postmaster)\b/i,
  // Template placeholders that ship inside website-builder demo content.
  /^(you|yourname|yourcompany|yourbusiness|someone|companyname|firstname|lastname|client|demo|test)@/i,
];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,24}/g;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isJunk(email) {
  return JUNK.some((re) => re.test(email));
}

/** `Info@Clinic.MA` -> `info@clinic.ma` */
function normalize(email) {
  return email.trim().toLowerCase().replace(/\.$/, "");
}

/**
 * Rank candidates so an address on the clinic's own domain beats a freemail one.
 * Generic role mailboxes (info@, contact@) are kept because they are usually the
 * only address a small practice publishes.
 */
function pickBest(candidates, domain) {
  const clean = [...new Set(candidates.map(normalize).filter((e) => !isJunk(e)))];
  if (clean.length === 0) return null;

  const onDomain = clean.filter((e) => e.endsWith(`@${domain}`));
  const role = (e) => /^(info|contact|contactez|hello|office|cabinet|rdv|rendez-vous|admin)@/.test(e);
  const pool = onDomain.length > 0 ? onDomain : clean;

  return (
    pool.find((e) => role(e)) ??
    pool.find((e) => !/\d{4,}/.test(e.split("@")[0])) ??
    pool[0]
  );
}

/** Honour robots.txt so we never hammer a site that asks crawlers not to. */
async function isAllowed(origin, pathname, cache) {
  if (!cache.has(origin)) {
    let disallow = [];
    try {
      const res = await fetch(`${origin}/robots.txt`, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        const text = await res.text();
        let applies = false;
        for (const raw of text.split("\n")) {
          const line = raw.trim();
          if (/^user-agent:/i.test(line)) applies = line.includes("*");
          else if (applies && /^disallow:/i.test(line)) {
            const value = line.slice(line.indexOf(":") + 1).trim();
            if (value) disallow.push(value);
          }
        }
      }
    } catch {
      /* no robots.txt reachable - treat as allowed */
    }
    cache.set(origin, disallow);
  }
  return !cache.get(origin).some((rule) => pathname.startsWith(rule));
}

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Strip tags so `mailto:` links and visible addresses both match. */
function extractEmails(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const decoded = text
    .replace(/&#64;|&commat;|&at;/g, "@")
    .replace(/\s+at\s+|\s*\[at\]\s*|\s*\(at\)\s*/gi, "@")
    .replace(/\s+dot\s+|\s*\[dot\]\s*|\s*\(dot\)\s*/gi, ".");
  return [...`${html} ${decoded}`.matchAll(EMAIL_RE)].map((m) => m[0]);
}

async function scrapeSite(siteUrl, robotsCache) {
  let origin;
  let domain;
  try {
    const url = new URL(siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`);
    origin = url.origin;
    domain = url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  const found = [];
  for (const pathname of CONTACT_PATHS) {
    if (!(await isAllowed(origin, pathname, robotsCache))) continue;
    const html = await fetchText(origin + pathname);
    if (!html) continue;
    found.push(...extractEmails(html));
    if (found.length > 0 && pathname === "/") continue;
    await sleep(REQUEST_DELAY_MS);
  }

  const best = pickBest(found, domain);
  return best ? { email: best, domain } : null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[EMAIL] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const { db } = await import("../src/prisma/db.ts");
  const clinics = await db.orm.public.Clinic.all();

  const withSite = clinics.filter((c) => c.website && String(c.website).trim());
  const targets = withSite.filter((c) => !c.email);
  const queue = LIMIT === undefined ? targets : targets.slice(0, LIMIT);

  console.log(`[EMAIL] clinics total        : ${clinics.length}`);
  console.log(`[EMAIL] with a website       : ${withSite.length}`);
  console.log(`[EMAIL] needing an email     : ${queue.length}`);
  console.log(`[EMAIL] mode                 : ${DRY_RUN ? "dry-run (no writes)" : "live write"}`);
  console.log("");

  const robotsCache = new Map();
  let done = 0;
  let found = 0;
  let failed = 0;
  const results = [];

  const queueRef = queue.slice();
  async function worker() {
    while (queueRef.length > 0) {
      const clinic = queueRef.shift();
      const hit = await scrapeSite(String(clinic.website), robotsCache);
      done += 1;

      if (!hit) {
        failed += 1;
      } else {
        found += 1;
        results.push({ name: clinic.name, city: clinic.citySlug, website: clinic.website, ...hit });
        console.log(`  [${String(done).padStart(3)}/${queueRef.length + done}] ${clinic.name} -> ${hit.email}`);
        if (!DRY_RUN) {
          await db.orm.public.Clinic.where({ id: clinic.id }).update({
            email: hit.email,
            emailSource: `website:${hit.domain}`,
          });
        }
      }
      if (done % 25 === 0) {
        console.log(`  ...${done} sites crawled, ${found} emails found, ${failed} without`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log("");
  console.log("------------------------------------------------------");
  console.log(`  Sites crawled      : ${done}`);
  console.log(`  Emails found       : ${found} (${Math.round((100 * found) / (done || 1))}% hit rate)`);
  console.log(`  No email on site   : ${failed}`);
  console.log(`  Emails in database : ${DRY_RUN ? "(dry run, not written)" : found}`);
  console.log("------------------------------------------------------");

  await db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("[EMAIL] failed:", err);
  process.exit(1);
});