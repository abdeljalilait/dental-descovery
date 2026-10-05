import prisma from "@/lib/prisma";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import type { JsonValue } from "@prisma/orm-framework/contract";
import { toInstant } from "@/src/prisma/codecs";

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
      errors: progress.errors !== undefined ? progress.errors : undefined,
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
