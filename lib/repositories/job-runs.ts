import prisma from "@/lib/prisma";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import type { JsonValue } from "@prisma/orm-framework/contract";
import { toInstant, toJson } from "@/src/prisma/codecs";
import type { SyncedClinicSummary } from "@/lib/services/serpapi";

export type { SyncedClinicSummary };

/**
 * Admin-triggered batch runs (WhatsApp campaign, SerpApi sync).
 *
 * Every run is a row first: the admin action writes the run, kicks the work off
 * with `after()`, and the UI polls the counters. Nothing lives only in memory,
 * so a run keeps reporting even if the page is reloaded.
 */

export type JobRunKind = "WHATSAPP_CAMPAIGN" | "SERPAPI_SYNC";
export type JobRunStatus = "RUNNING" | "COMPLETED" | "FAILED";

const jobRuns = () => prisma.orm.public.JobRun;

type JobRunRow = ResultType<ReturnType<typeof jobRuns>>;

export type { JobRunRow };

export function parseJobErrors(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((e) => (typeof e === "string" ? e : JSON.stringify(e)));
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((e) => (typeof e === "string" ? e : JSON.stringify(e)));
      }
      return [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

export function parseSyncedClinics(raw: unknown): SyncedClinicSummary[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (typeof raw === "object" && raw !== null && "syncedClinics" in raw) {
    const list = (raw as Record<string, unknown>).syncedClinics;
    if (Array.isArray(list)) return list as SyncedClinicSummary[];
  }
  return [];
}

export function parseSearchQueries(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.searchQueries) && obj.searchQueries.length > 0) {
      return obj.searchQueries as string[];
    }
    // Reconstruct from keywords and city if available in params
    if (Array.isArray(obj.keywords) && obj.keywords.length > 0) {
      const kws = obj.keywords as string[];
      if (typeof obj.city === "string" && obj.city) {
        return kws.map((k) => `${k} ${obj.city} maroc`);
      }
      return kws;
    }
  }
  return [];
}

export interface CreateJobRunInput {
  kind: JobRunKind;
  requestedBy?: string;
  /** `params` is a jsonb column, so it is narrowed before it reaches the driver. */
  params?: Record<string, JsonValue>;
  message?: string;
}

export async function createJobRunDb(input: CreateJobRunInput): Promise<string> {
  const row = await jobRuns().create({
    kind: input.kind,
    status: "RUNNING",
    requestedBy: input.requestedBy ?? null,
    params: input.params ?? null,
    message: input.message ?? null,
    total: 0,
  });
  return row.id;
}

export interface JobRunCounters {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  total: number;
}

export interface JobRunProgress extends JobRunCounters {
  /** Omitted on intermediate ticks so the last message is not wiped. */
  message?: string;
  /** Terminal runs get a status and a finish timestamp. */
  status?: JobRunStatus;
  /** Error messages or failure details. */
  errors?: string[];
  /** Synced clinic summaries to inspect in admin modal. */
  syncedClinics?: SyncedClinicSummary[];
  /** Search queries used by the SerpApi job. */
  searchQueries?: string[];
}

/**
 * A run is considered abandoned after this long without progress.
 *
 * The runner executes inside the Next.js process via `after()`, so a deploy or
 * crash can leave a row in RUNNING forever. Without this window a single dead run
 * would block the admin from ever starting another one.
 */
const STALE_RUN_MINUTES = 30;

/** `updatedAt` decodes to a Temporal.Instant; compare it as an ISO string. */
function isStale(updatedAt: unknown): boolean {
  const stamp = new Date(String(updatedAt)).getTime();
  if (Number.isNaN(stamp)) return false;
  return Date.now() - stamp > STALE_RUN_MINUTES * 60 * 1000;
}

export async function updateJobRunProgressDb(id: string, progress: JobRunProgress): Promise<void> {
  let paramsValue = undefined;
  if (
    (progress.syncedClinics && progress.syncedClinics.length > 0) ||
    (progress.searchQueries && progress.searchQueries.length > 0)
  ) {
    const existing = await jobRuns().where({ id }).first();
    const existingParams = (existing?.params as Record<string, unknown> | null) ?? {};
    paramsValue = toJson({
      ...existingParams,
      ...(progress.syncedClinics ? { syncedClinics: progress.syncedClinics } : {}),
      ...(progress.searchQueries ? { searchQueries: progress.searchQueries } : {}),
    });
  }

  await jobRuns()
    .where({ id })
    .update({
      processed: progress.processed,
      succeeded: progress.succeeded,
      failed: progress.failed,
      skipped: progress.skipped,
      total: progress.total,
      // `timestamptz` columns are written as Temporal.Instant on this codec.
      finishedAt: progress.status ? toInstant(new Date()) : undefined,
      status: progress.status,
      // Omitted on intermediate ticks, so the newest message is never wiped.
      message: progress.message,
      errors: progress.errors !== undefined ? toJson(progress.errors) : undefined,
      params: paramsValue,
    });
}

/** Close a run out as failed/completed after the runner threw or finished. */
export async function finishJobRunDb(
  id: string,
  result: { status: JobRunStatus; message: string; errors?: string[] },
): Promise<void> {
  await jobRuns()
    .where({ id })
    .update({
      status: result.status,
      message: result.message,
      finishedAt: toInstant(new Date()),
      errors: result.errors !== undefined ? result.errors : undefined,
    });
}

export async function getJobRunDb(id: string): Promise<JobRunRow | null> {
  return jobRuns().where({ id }).first();
}

export async function listJobRunsDb(limit = 20): Promise<JobRunRow[]> {
  return jobRuns().orderBy((run) => run.createdAt.desc()).limit(limit).all();
}

/**
 * Delete one finished run.
 *
 * Refuses a RUNNING row: the runner is executing inside `after()` and holds only
 * this id for progress updates, so deleting it mid-flight would leave the work
 * running with nowhere to report.
 */
export async function deleteJobRunDb(id: string): Promise<boolean> {
  const run = await getJobRunDb(id);
  if (!run || run.status === "RUNNING") return false;
  await jobRuns().where({ id }).delete();
  return true;
}

/** Clear the history in one go, leaving any in-flight run reporting. */
export async function clearFinishedJobRunsDb(): Promise<number> {
  // The ORM `where` has no `in` operator, so the status test happens here rather
  // than in SQL. `job_runs` only ever holds a console-sized number of rows.
  const finished = (await jobRuns().all()).filter((run) => run.status !== "RUNNING");
  for (const run of finished) {
    await jobRuns().where({ id: run.id }).delete();
  }
  return finished.length;
}

export async function hasRunningJobDb(kind: JobRunKind): Promise<boolean> {
  const run = await jobRuns().where({ kind, status: "RUNNING" }).orderBy((row) => row.updatedAt.desc()).first();
  if (!run) return false;
  // Stale rows are reaped by `reapStaleJobRunsDb`; ignore them here so a dead
  // run never blocks the operator from retrying.
  return !isStale(run.updatedAt);
}

/** Close runs abandoned by a deploy or crash so the console stays truthful. */
export async function reapStaleJobRunsDb(): Promise<number> {
  const stale = (await jobRuns().where({ status: "RUNNING" }).all()).filter((run) =>
    isStale(run.updatedAt),
  );

  for (const run of stale) {
    await jobRuns()
      .where({ id: run.id })
      .update({
        status: "FAILED",
        message: "Abandoned: no progress before the run timed out",
        finishedAt: toInstant(new Date()),
      });
  }

  return stale.length;
}
export interface CampaignDeliverySummary {
  status: string;
  count: number;
}

/**
 * Delivery breakdown for the campaign progress panel.
 *
 * `accepted` is what Kapso returned at send time; `delivered` and `read` come
 * from the receipt webhook, so this is the number of clinics that actually
 * received the message rather than merely queued it.
 */
export async function getCampaignDeliverySummaryDb(
  templateKey?: string,
): Promise<CampaignDeliverySummary[]> {
  const rows = templateKey
    ? await prisma.orm.public.ClinicOutreach.where({ template: templateKey }).all()
    : await prisma.orm.public.ClinicOutreach.where({ channel: "WHATSAPP" }).all();

  const counts = new Map<string, number>();
  for (const row of rows) {
    const status = row.status ?? "UNKNOWN";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}
