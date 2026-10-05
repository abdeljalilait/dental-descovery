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
  DENTAL_KEYWORDS,
  MONTHLY_SEARCH_BUDGET,
  PRIMARY_DENTAL_KEYWORDS,
  SearchBudget,
  getSerpApiAccountInfo,
  isSameClinicAs,
  resolveNameAr,
  sanitizeKeywords,
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
const keywordsArg = args.find((a) => a.startsWith("--keywords="))?.split("=")[1];
const keywordArg = args.find((a) => a.startsWith("--keyword="))?.split("=")[1];
const isAllKeywords = args.includes("--all-keywords") || keywordsArg === "all";
const isQuick = args.includes("--quick") || args.includes("--primary");

// Resolve the keyword strategy, then validate it against the catalogue so a
// typo in a flag can never become a billable query.
let requestedKeywords;
if (keywordArg) {
  requestedKeywords = [keywordArg.trim()];
} else if (keywordsArg && keywordsArg !== "all") {
  requestedKeywords = keywordsArg.split(",").map((k) => k.trim());
} else if (isAllKeywords) {
  requestedKeywords = DENTAL_KEYWORDS;
} else if (isQuick) {
  requestedKeywords = PRIMARY_DENTAL_KEYWORDS;
}

const selectedKeywords =
  requestedKeywords === undefined ? undefined : sanitizeKeywords(requestedKeywords);

if (requestedKeywords !== undefined && selectedKeywords.length === 0) {
  console.error(
    `\x1b[31m[ERROR]\x1b[0m None of the requested keywords are in the catalogue.\n` +
      `        Available: ${DENTAL_KEYWORDS.join(", ")}`,
  );
  process.exit(1);
}

// Calculate safe search budget to protect the 250/month free tier
const defaultMax = cityArg ? (selectedKeywords ? selectedKeywords.length : 7) : 15;
const configuredMax = Number(
  process.env.SERPAPI_MAX_SEARCHES ?? process.env.SERAPI_MAX_SEARCHES ?? defaultMax,
);
let budgetLimit = maxSearchesArg
  ? Math.min(Number(maxSearchesArg), MONTHLY_SEARCH_BUDGET)
  : Math.min(configuredMax, MONTHLY_SEARCH_BUDGET);

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

      // Match in descending order of confidence: the Google place id, then the
      // exact slug, then city + phone, then the name — where the name match only
      // counts when a phone or address confirms the same practice.
      const byPlaceId = clinic.googlePlaceId
        ? await db.orm.public.Clinic.where({ googlePlaceId: clinic.googlePlaceId }).first()
        : null;
      const bySlug = byPlaceId
        ? null
        : await db.orm.public.Clinic.where({ slug: clinic.slug }).first();
      const byPhone =
        byPlaceId || bySlug || !clinic.phone
          ? null
          : await db.orm.public.Clinic.where({ citySlug: clinic.citySlug, phone: clinic.phone }).first();
      const existing =
        byPlaceId ||
        bySlug ||
        byPhone ||
        (await db.orm.public.Clinic.where({ name: clinic.name, citySlug: clinic.citySlug }).all()).find(
          (row) => isSameClinicAs(clinic, row),
        );

      const slugToUse = existing?.slug || clinic.slug;

      const upserted = await db.orm.public.Clinic.upsert({
        conflictOn: { slug: slugToUse },
        update: {
          googlePlaceId: clinic.googlePlaceId ?? existing?.googlePlaceId ?? null,
          name: clinic.name,
          nameAr: resolveNameAr(clinic.name, clinic.nameAr, existing?.nameAr),
          citySlug: clinic.citySlug,
          neighborhoodFr: clinic.neighborhood.fr,
          neighborhoodAr: clinic.neighborhood.ar,
          addressFr: clinic.address.fr,
          addressAr: clinic.address.ar,
          phone: clinic.phone ?? existing?.phone,
          phoneHref: clinic.phoneHref ?? existing?.phoneHref,
          whatsapp: clinic.whatsapp ?? existing?.whatsapp,
          website: clinic.website ?? existing?.website,
          rating: clinic.rating,
          reviewCount: clinic.reviewCount,
          verified: clinic.verified || Boolean(existing?.verified),
          descriptionFr: clinic.description.fr,
          descriptionAr: clinic.description.ar,
          lat: clinic.lat,
          lng: clinic.lng,
          hours,
          lastSyncedAt,
        },
        create: {
          slug: slugToUse,
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

  // Check live account info (costs 0 search credits)
  const accountInfo = await getSerpApiAccountInfo(SERPAPI_KEY);

  console.log(`\n======================================================`);
  console.log(`  Dentora - SerpApi Clinic Sync`);
  if (accountInfo) {
    console.log(`  SerpApi Plan: ${accountInfo.planName}`);
    console.log(`  Monthly Usage: ${accountInfo.thisMonthUsage} / ${accountInfo.searchesPerMonth} searches used`);
    console.log(`  Remaining In Plan: ${accountInfo.totalSearchesLeft} searches`);
    if (accountInfo.totalSearchesLeft > 0 && accountInfo.totalSearchesLeft < budgetLimit) {
      console.log(`  \x1b[33m[NOTICE]\x1b[0m Capping run budget to remaining plan credits: ${accountInfo.totalSearchesLeft}`);
      budgetLimit = accountInfo.totalSearchesLeft;
    }
  }
  budgetLimit = Math.max(1, budgetLimit);
  console.log(`  Target Cities: ${targetCities.length} (${targetCities.map((c) => c.name).join(", ")})`);
  console.log(`  Run Budget Cap: ${budgetLimit} searches (Max ${MONTHLY_SEARCH_BUDGET}/mo)`);
  console.log(`  Keyword Strategy: ${selectedKeywords ? selectedKeywords.join(", ") : targetCities.length > 1 ? 'Primary ("dentiste", 1 search/city to protect quota)' : 'All specialties'}`);
  console.log(`  Mode: ${isDryRun ? "DRY-RUN (nothing written)" : "LIVE SYNC"}`);
  console.log(`======================================================\n`);

  const budget = new SearchBudget(budgetLimit);

  const report = await syncAllCities(targetCities, SERPAPI_KEY, {
    budget,
    keywords: selectedKeywords,
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