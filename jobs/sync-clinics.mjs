/**
 * Bree Job Worker: sync-clinics.mjs
 *
 * Searches SerpApi's Google Maps engine for dental clinics, once per dental
 * keyword per city, deduplicates the results and persists them to PostgreSQL.
 *
 * Every search is charged against a shared monthly budget (SerpApi free tier:
 * 250 searches/month, 50/hour), so a run can never overspend the quota.
 * Runs in a dedicated worker thread. Compatible with Bree v9+.
 */

import { parentPort } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { cities } from "../lib/data/cities.ts";
import {
  MONTHLY_SEARCH_BUDGET,
  SearchBudget,
  syncAllCities,
} from "../lib/services/serpapi-core.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env.local then .env using dotenv
dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;

/** Cities to sweep; overridden per run via SYNC_CITIES (comma-separated). */
const targetCities = process.env.SYNC_CITIES
  ? cities.filter((c) => process.env.SYNC_CITIES.split(",").map((s) => s.trim()).includes(c.slug))
  : cities;

/** Optional cap for a single run, e.g. to leave quota for a manual sync. */
const runBudget = process.env.SYNC_MAX_SEARCHES
  ? Number(process.env.SYNC_MAX_SEARCHES)
  : MONTHLY_SEARCH_BUDGET;

/** Persist the results to PostgreSQL. */
async function saveToDatabase(clinics) {
  if (!process.env.DATABASE_URL) {
    console.warn("[Bree:sync-clinics] DATABASE_URL is not defined — skipping database save.");
    return 0;
  }

  const { db } = await import("../src/prisma/db.ts");
  const { toInstant, toJson } = await import("../src/prisma/codecs.ts");

  let count = 0;

  for (const clinic of clinics) {
    try {
      // `lastSyncedAt` is a timestamptz on the temporal codec, which rejects a
      // JavaScript `Date` and encodes `Temporal.Instant` instead.
      const lastSyncedAt = toInstant(clinic.lastSyncedAt || new Date().toISOString());
      const hours = toJson(clinic.hours);

      const upserted = await db.orm.public.Clinic.upsert({
        conflictOn: { slug: clinic.slug },
        update: {
          googlePlaceId: clinic.googlePlaceId,
          name: clinic.name,
          nameAr: clinic.nameAr,
          citySlug: clinic.citySlug,
          neighborhoodFr: clinic.neighborhood.fr,
          neighborhoodAr: clinic.neighborhood.ar,
          addressFr: clinic.address.fr,
          addressAr: clinic.address.ar,
          phone: clinic.phone,
          phoneHref: clinic.phoneHref,
          whatsapp: clinic.whatsapp,
          website: clinic.website,
          rating: clinic.rating,
          reviewCount: clinic.reviewCount,
          verified: clinic.verified,
          descriptionFr: clinic.description.fr,
          descriptionAr: clinic.description.ar,
          lat: clinic.lat,
          lng: clinic.lng,
          hours,
          lastSyncedAt,
        },
        create: {
          slug: clinic.slug,
          googlePlaceId: clinic.googlePlaceId,
          name: clinic.name,
          nameAr: clinic.nameAr,
          citySlug: clinic.citySlug,
          neighborhoodFr: clinic.neighborhood.fr,
          neighborhoodAr: clinic.neighborhood.ar,
          addressFr: clinic.address.fr,
          addressAr: clinic.address.ar,
          phone: clinic.phone,
          phoneHref: clinic.phoneHref,
          whatsapp: clinic.whatsapp,
          website: clinic.website,
          rating: clinic.rating,
          reviewCount: clinic.reviewCount,
          verified: clinic.verified,
          claimed: false,
          usesApp: false,
          descriptionFr: clinic.description.fr,
          descriptionAr: clinic.description.ar,
          lat: clinic.lat,
          lng: clinic.lng,
          hours,
          lastSyncedAt,
        },
      });

      for (const specSlug of clinic.specialtySlugs) {
        const spec = await db.orm.public.Specialty.where({ slug: specSlug }).first();
        if (spec) {
          await db.orm.public.ClinicSpecialty.upsert({
            conflictOn: { clinicId: upserted.id, specialtyId: spec.id },
            update: {},
            create: { clinicId: upserted.id, specialtyId: spec.id },
          });
        }
      }

      count++;
    } catch (err) {
      console.error(`[Bree:sync-clinics] Failed to save ${clinic.slug}:`, err.message);
    }
  }

  return count;
}

async function run() {
  if (!SERPAPI_KEY) {
    console.warn("[Bree:sync-clinics] SERPAPI_API_KEY is not defined. Skipping sync run.");
    if (parentPort) parentPort.postMessage("skipped: missing API key");
    return;
  }

  const budget = new SearchBudget(runBudget);

  console.log(
    `[Bree:sync-clinics] Syncing ${targetCities.length} cities ` +
      `(budget: ${budget.limit} searches this run)`,
  );

  const report = await syncAllCities(targetCities, SERPAPI_KEY, {
    budget,
    onQuery: ({ city, query, index, total }) => {
      console.log(`  [${index + 1}/${total}] ${city.name}: "${query}"`);
    },
    onCity: (result) => {
      const status = result.error ? `errors: ${result.error.slice(0, 160)}` : "ok";
      console.log(
        `  -> ${result.cityName}: ${result.fetched} unique clinics ` +
          `(${result.searchesUsed} searches) [${status}]`,
      );
    },
  });

  const allClinics = report.details.flatMap((d) => d.clinics);

  const savedCount = await saveToDatabase(allClinics);

  // No JSON snapshot is written: the database is the single source of truth for
  // clinics, and a second copy under `lib/data` was only ever a stale duplicate.
  // Inspect a sync with SQL, or `npm run outreach:list` for a flat CSV.

  const summary =
    `Done! ${report.totalClinics} unique clinics across ${targetCities.length} cities. ` +
    `Saved ${savedCount} to PostgreSQL. ` +
    `SerpApi searches: ${report.searchesUsed}/${report.searchBudget} ` +
    `(${report.searchesRemaining} remaining).`;

  console.log(`[Bree:sync-clinics] ${summary}`);

  if (parentPort) {
    parentPort.postMessage(summary);
  }
}

run().catch((err) => {
  console.error("[Bree:sync-clinics] Fatal error:", err);
  process.exit(1);
});