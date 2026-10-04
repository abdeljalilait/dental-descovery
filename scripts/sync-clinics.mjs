#!/usr/bin/env node

/**
 * Dentora - SerpApi Clinic Synchronizer CLI
 *
 * Searches SerpApi's Google Maps engine once per dental keyword per city,
 * deduplicates the results and saves them to PostgreSQL.
 *
 * Usage:
 *   node scripts/sync-clinics.mjs
 *   node scripts/sync-clinics.mjs --city=casablanca
 *   node scripts/sync-clinics.mjs --dry-run
 *   node scripts/sync-clinics.mjs --max-searches=20
 *
 * SerpApi Free Plan limits (enforced at runtime by SearchBudget):
 *   - 250 searches / month
 *   - 50 throughput / hour
 */

import fs from "node:fs";
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

if (!SERPAPI_KEY) {
  console.error("\x1b[31m[ERROR]\x1b[0m SERPAPI_API_KEY is not defined in environment variables or .env.local");
  console.error("Sign up for free at https://serpapi.com (250 searches/month free) and set SERPAPI_API_KEY.");
  process.exit(1);
}

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const cityArg = args.find((a) => a.startsWith("--city="))?.split("=")[1]?.toLowerCase();
const maxSearchesArg = args.find((a) => a.startsWith("--max-searches="))?.split("=")[1];

const budgetLimit = maxSearchesArg ? Number(maxSearchesArg) : MONTHLY_SEARCH_BUDGET;

async function saveToDatabase(clinics) {
  if (!process.env.DATABASE_URL) {
    console.log("\x1b[33m[WARN]\x1b[0m DATABASE_URL is not defined — skipping database save.");
    return 0;
  }

  const { db } = await import("../src/prisma/db.ts");
  const { toInstant, toJson } = await import("../src/prisma/codecs.ts");

  let count = 0;

  for (const clinic of clinics) {
    try {
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
      console.error(`\x1b[31m[FAILED]\x1b[0m ${clinic.slug}: ${err.message}`);
    }
  }

  return count;
}

async function run() {
  const targetCities = cityArg ? cities.filter((c) => c.slug === cityArg) : cities;

  if (targetCities.length === 0) {
    console.error(
      `City '${cityArg}' not found. Available: ${cities.map((c) => c.slug).join(", ")}`,
    );
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`  Dentora - SerpApi Clinic Sync`);
  console.log(`  Target Cities: ${targetCities.length}`);
  console.log(`  Search Budget This Run: ${budgetLimit}`);
  console.log(`  Mode: ${isDryRun ? "DRY-RUN (nothing written)" : "LIVE SYNC"}`);
  console.log(`======================================================\n`);

  const budget = new SearchBudget(budgetLimit);

  const report = await syncAllCities(targetCities, SERPAPI_KEY, {
    budget,
    onQuery: ({ city, query, index, total }) => {
      console.log(`\x1b[36m[SYNC]\x1b[0m [${index + 1}/${total}] ${city.name} — "${query}"`);
    },
    onCity: (result) => {
      const suffix = result.error ? ` \x1b[33m(${result.error.slice(0, 160)})\x1b[0m` : "";
      console.log(
        `  -> ${result.cityName}: ${result.fetched} unique clinics ` +
          `(${result.searchesUsed} searches)${suffix}`,
      );
    },
  });

  const allClinics = report.details.flatMap((d) => d.clinics);

  console.log(`\n------------------------------------------------------`);
  console.log(`Sync Summary:`);
  console.log(`  - Unique Clinics Fetched: ${report.totalClinics}`);
  console.log(`  - SerpApi Searches Used: ${report.searchesUsed} / ${report.searchBudget} budget`);
  console.log(`  - Searches Left In Budget: ${report.searchesRemaining}`);
  console.log(`------------------------------------------------------\n`);

  if (isDryRun) {
    console.log("\x1b[33m[DRY-RUN]\x1b[0m No data was written.");
    return;
  }

  const savedCount = await saveToDatabase(allClinics);
  console.log(`\x1b[32m[SUCCESS]\x1b[0m Saved ${savedCount} clinics to PostgreSQL.`);

  if (allClinics.length > 0) {
    const outputPath = path.join(rootDir, "lib", "data", "synced-clinics.json");
    fs.writeFileSync(outputPath, JSON.stringify(allClinics, null, 2), "utf-8");
    console.log(`\x1b[32m[SUCCESS]\x1b[0m Wrote JSON snapshot to: ${outputPath}`);
  }

  const { db } = await import("../src/prisma/db.ts");
  await db.close();
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});