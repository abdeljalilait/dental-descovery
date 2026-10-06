import { cities } from "@/lib/data/cities";
import { PRIMARY_DENTAL_KEYWORDS } from "@/lib/services/serpapi-core.mjs";
import {
  type JobRunCounters,
  type JobRunProgress,
  type JobRunStatus,
  updateJobRunProgressDb,
} from "@/lib/repositories/job-runs";
import {
  syncAllCities,
  upsertClinicsToDatabase,
  type SyncedClinicSummary,
} from "@/lib/services/serpapi";

export interface SyncRunOptions {
  city?: string;
  maxSearches?: number;
  maxPages?: number;
  keywords?: string[];
  delayMs?: number;
  budget?: number;
  jobRunId?: string;
}

export interface SyncRunResult extends JobRunCounters {
  searchesUsed: number;
  cities: string[];
}

async function report(jobRunId: string | undefined, progress: JobRunProgress): Promise<void> {
  if (jobRunId) await updateJobRunProgressDb(jobRunId, progress);
}

/**
 * SerpApi sync as an admin-triggered background run.
 *
 * Scrapes dental clinics from Google Maps via SerpApi and persists them to PostgreSQL.
 * Reports per-city progress into `job_runs`.
 */
export async function runClinicSync(options: SyncRunOptions = {}): Promise<SyncRunResult> {
  const cityFilter = options.city ? [options.city] : undefined;
  const defaultMax = cityFilter ? 7 : 15;
  const maxSearches =
    options.maxSearches ??
    Number(process.env.SERPAPI_MAX_SEARCHES ?? process.env.SERAPI_MAX_SEARCHES ?? defaultMax);
  const delayMs =
    options.delayMs ??
    Number(process.env.SERPAPI_DELAY_MS ?? process.env.SERAPI_DELAY_MS ?? 1500);

  await report(options.jobRunId, {
    total: cityFilter ? cityFilter.length : cities.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    message: `Syncing with max ${maxSearches} SerpApi searches`,
  });

  const report_ = await syncAllCities({
    cityFilter,
    delayMs,
    maxSearches,
    maxPages: options.maxPages,
    keywords: options.keywords,
  });

  const allClinics = report_.details.flatMap((d) => d.clinics);
  let syncedClinics: SyncedClinicSummary[] = [];
  if (allClinics.length > 0) {
    const upsertRes = await upsertClinicsToDatabase(allClinics);
    syncedClinics = upsertRes.syncedClinics;
  }

  const syncErrors = report_.details
    .filter((city) => Boolean(city.error))
    .map((city) => `${city.cityName || city.citySlug}: ${city.error}`);

  const counters: JobRunCounters = {
    total: report_.totalCities,
    processed: report_.details.length,
    succeeded: report_.details.filter((city) => city.fetched > 0).length,
    failed: report_.details.filter((city) => city.fetched === 0).length,
    skipped: 0,
  };

  const status: JobRunStatus =
    counters.total > 0 && counters.failed === counters.total ? "FAILED" : "COMPLETED";

  const targetCities = cityFilter ? cities.filter((c) => cityFilter.includes(c.slug)) : cities;
  const effectiveKeywords =
    options.keywords && options.keywords.length > 0 ? options.keywords : PRIMARY_DENTAL_KEYWORDS;
  const searchQueries = targetCities.flatMap((c) =>
    effectiveKeywords.map((k) => `${k} ${c.name} maroc`),
  );

  await report(options.jobRunId, {
    ...counters,
    status,
    message: `${report_.totalClinics} clinics from ${report_.searchesUsed} searches (${syncedClinics.length} saved)`,
    errors: syncErrors.length > 0 ? syncErrors : undefined,
    syncedClinics,
    searchQueries,
  });

  return {
    ...counters,
    searchesUsed: report_.searchesUsed,
    cities: report_.details.map((c) => c.citySlug),
  };
}
