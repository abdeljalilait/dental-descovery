import type { CampaignTemplate, TemplateVars } from "@/lib/campaign/templates";
import { getTemplateByKey } from "@/lib/campaign/templates";
import { cities } from "@/lib/data/cities";
import { siteConfig } from "@/lib/site.config";
import { db } from "@/src/prisma/db";
import { toInstant, type InstantInput } from "@/src/prisma/codecs";
import type { JobRunKind } from "@/lib/repositories/job-runs";
import {
  type JobRunCounters,
  type JobRunProgress,
  updateJobRunProgressDb,
} from "@/lib/repositories/job-runs";
import { toWhatsApp } from "@/lib/utils/phone";
import { sendWhatsAppViaKapso } from "@/lib/services/whatsapp-kapso";

/**
 * Batch runners started from `/admin/jobs`.
 *
 * Every runner is resumable and reports into a `job_runs` row, because the
 * admin UI polls those counters instead of holding the response open. Sends
 * stay bounded by `maxPerRun` so a run can never blow through the Meta/Kapso
 * throughput limit, and every clinic is written back immediately so a crashed
 * run still leaves accurate delivery state.
 */

export interface CampaignSendOptions {
  dryRun?: boolean;
  city?: string;
  templateKey?: string;
  /** Re-send even if the clinic already has a SENT/DELIVERED/READ row. */
  force?: boolean;
  maxPerRun?: number;
  delayMs?: number;
  /**
   * Restrict the run to these clinic slugs.
   *
   * Used by the per-clinic "send template" action in `/admin/clinics`, where the
   * operator picked one row instead of a whole segment.
   */
  clinicSlugs?: string[];
  /** Progress sink; absent in CLI usage. */
  jobRunId?: string;
}

export interface CampaignSendResult extends JobRunCounters {
  eligible: number;
  errors: string[];
}

export interface CampaignPreview {
  templateKey: string;
  eligible: number;
  alreadyContacted: number;
  optedOut: number;
  noWhatsapp: number;
  sample: { clinicName: string; cityName: string; whatsapp: string; message: string }[];
}

const TERMINAL_STATUSES = ["SENT", "DELIVERED", "READ", "REPLIED"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cityName(slug: string): string {
  return cities.find((city) => city.slug === slug)?.name ?? slug;
}

function profileUrlFor(citySlug: string, slug: string): string {
  return `${siteConfig.url}/fr/dentistes/${citySlug}/${slug}`;
}

/**
 * Values in the exact order the approved template declares them, since the
 * Cloud API matches body parameters positionally.
 */
function templateVariables(template: CampaignTemplate, vars: TemplateVars): string[] {
  return template.variables.map((key) => vars[key]);
}

function renderBody(template: CampaignTemplate, vars: TemplateVars): string {
  const lookup: Partial<Record<keyof TemplateVars, string>> = vars;
  return template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = lookup[key as keyof TemplateVars];
    return value ?? "";
  });
}

interface Candidate {
  id: string;
  slug: string;
  name: string;
  citySlug: string;
  whatsapp: string;
  e164: string;
  alreadyContacted: boolean;
}

async function loadCandidates(
  city: string | undefined,
  templateKey: string,
  clinicSlugs?: string[],
): Promise<{
  candidates: Candidate[];
  optedOut: Set<string>;
  totalNoWhatsapp: number;
  totalAlready: number;
}> {
  const [clinics, outreachRows] = await Promise.all([
    db.orm.public.Clinic.all(),
    db.orm.public.ClinicOutreach.where({ channel: "WHATSAPP" }).all(),
  ]);

  const optedOut = new Set(
    outreachRows.filter((row) => row.status === "OPTED_OUT").map((row) => row.clinicId),
  );

  const pool = clinics.filter((clinic) => {
    if (clinicSlugs && !clinicSlugs.includes(clinic.slug)) return false;
    if (city && clinic.citySlug !== city) return false;
    // An explicit slug list is a manual, per-clinic action: the prospect filter
    // would silently drop a clinic the operator already knows about.
    return clinicSlugs ? true : !clinic.usesApp;
  });

  const candidates: Candidate[] = [];
  let totalNoWhatsapp = 0;
  let totalAlready = 0;

  for (const clinic of pool) {
    const wa = toWhatsApp(clinic.whatsapp);
    if (!wa.dialable) {
      totalNoWhatsapp++;
      continue;
    }
    const previous = outreachRows.find(
      (row) => row.clinicId === clinic.id && TERMINAL_STATUSES.includes(row.status ?? ""),
    );
    const alreadyContacted = previous?.template === templateKey;
    if (alreadyContacted) totalAlready++;
    candidates.push({
      id: clinic.id,
      slug: clinic.slug,
      name: clinic.name,
      citySlug: clinic.citySlug,
      whatsapp: clinic.whatsapp ?? "",
      e164: wa.e164,
      alreadyContacted,
    });
  }

  return { candidates, optedOut, totalNoWhatsapp, totalAlready };
}

/**
 * Eligibility preview for the admin UI: how many clinics the campaign would
 * touch and a rendered sample, so the operator sees the real payload before
 * spending a single message.
 */
export async function previewCampaign(
  options: { city?: string; templateKey: string; limit?: number } ,
): Promise<CampaignPreview> {
  const template = getTemplateByKey(options.templateKey);
  if (!template) throw new Error(`Template not found: ${options.templateKey}`);

  const { candidates, optedOut, totalNoWhatsapp, totalAlready } = await loadCandidates(
    options.city,
    options.templateKey,
  );

  const eligible = candidates.filter((candidate) => !candidate.alreadyContacted && !optedOut.has(candidate.id));
  const sampleLimit = options.limit ?? 3;

  return {
    templateKey: template.key,
    eligible: eligible.length,
    alreadyContacted: totalAlready,
    optedOut: optedOut.size,
    noWhatsapp: totalNoWhatsapp,
    sample: eligible.slice(0, sampleLimit).map((candidate) => {
      const vars: TemplateVars = {
        clinicName: candidate.name,
        cityName: cityName(candidate.citySlug),
        profileUrl: profileUrlFor(candidate.citySlug, candidate.slug),
      };
      return { ...vars, whatsapp: candidate.e164, message: renderBody(template, vars) };
    }),
  };
}

async function report(jobRunId: string | undefined, progress: JobRunProgress): Promise<void> {
  if (jobRunId) await updateJobRunProgressDb(jobRunId, progress);
}

async function upsertOutreach(
  clinicId: string,
  templateKey: string,
  data: {
    status: string;
    note?: string;
    providerMessageId?: string;
    sentAt?: InstantInput;
    failedAt?: InstantInput;
  },
): Promise<void> {
  // Optional columns are omitted rather than nulled so a retry keeps the
  // original send timestamp and message id.
  await db.orm.public.ClinicOutreach.upsert({
    conflictOn: { clinicId, channel: "WHATSAPP" },
    create: {
      clinicId,
      channel: "WHATSAPP",
      status: data.status,
      template: templateKey,
      note: data.note,
      providerMessageId: data.providerMessageId,
      sentAt: data.sentAt,
      failedAt: data.failedAt,
    },
    update: {
      status: data.status,
      template: templateKey,
      note: data.note ?? null,
      providerMessageId: data.providerMessageId ?? null,
      sentAt: data.sentAt ?? undefined,
      failedAt: data.failedAt ?? undefined,
    },
  });
}

/**
 * Send the campaign, reporting progress into `jobRunId` as it goes.
 *
 * `sent` means WhatsApp accepted the message; the true "received" count comes
 * from the delivery webhook, which moves rows SENT -> DELIVERED -> READ.
 */
export async function sendCampaign(options: CampaignSendOptions = {}): Promise<CampaignSendResult> {
  const dryRun = options.dryRun ?? process.env.CAMPAIGN_DRY_RUN !== "false";
  const force = options.force ?? false;
  const maxPerRun = options.maxPerRun ?? Number(process.env.CAMPAIGN_MAX_PER_RUN ?? 50);
  const delayMs = options.delayMs ?? Number(process.env.CAMPAIGN_DELAY_MS ?? 2000);
  const templateKey = options.templateKey ?? process.env.CAMPAIGN_TEMPLATE_KEY ?? "dental-app-promo-fr";

  const template = getTemplateByKey(templateKey);
  if (!template) throw new Error(`Template not found: ${templateKey}`);

  const { candidates, optedOut } = await loadCandidates(
    options.city,
    template.key,
    options.clinicSlugs,
  );
  const eligible = candidates.filter(
    (candidate) => (force || !candidate.alreadyContacted) && !optedOut.has(candidate.id),
  );
  const selected = eligible.slice(0, Math.max(0, maxPerRun));

  const counters: JobRunCounters = {
    total: selected.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };
  const errors: string[] = [];

  await report(options.jobRunId, {
    ...counters,
    message: dryRun ? "Dry run: nothing is sent to Kapso" : `Sending template ${template.key}`,
  });

  for (const candidate of selected) {
    const vars: TemplateVars = {
      clinicName: candidate.name,
      cityName: cityName(candidate.citySlug),
      profileUrl: profileUrlFor(candidate.citySlug, candidate.slug),
    };

    if (dryRun) {
      counters.skipped++;
      counters.processed++;
      await report(options.jobRunId, { ...counters });
      continue;
    }

    const res = await sendWhatsAppViaKapso({
      to: candidate.e164,
      template: template.key,
      language: template.locale === "ar" ? "ar" : "fr",
      variables: templateVariables(template, vars),
    });

    if (res.ok) {
      counters.succeeded++;
      try {
        await upsertOutreach(candidate.id, template.key, {
          status: "SENT",
          providerMessageId: res.messageId,
          sentAt: toInstant(new Date()),
        });
      } catch (error) {
        errors.push(`${candidate.slug}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      counters.failed++;
      errors.push(`${candidate.slug}: ${res.error ?? "unknown error"}`);
      try {
        await upsertOutreach(candidate.id, template.key, {
          status: "FAILED",
          note: res.error ?? "send failed",
          failedAt: toInstant(new Date()),
        });
      } catch {
        // A bookkeeping failure must not abort the batch; the run summary
        // already carries the send error.
      }
    }

    counters.processed++;
    await report(options.jobRunId, { ...counters });

    if (delayMs > 0) await sleep(delayMs);
  }

  await report(options.jobRunId, {
    ...counters,
    status: "COMPLETED",
    message: `${dryRun ? "Dry run" : "Sent"}: ${counters.succeeded}/${counters.total} accepted, ${counters.failed} failed`,
  });

  return { ...counters, eligible: eligible.length, errors };
}

export interface SyncRunOptions {
  city?: string;
  maxSearches?: number;
  delayMs?: number;
  budget?: number;
  jobRunId?: string;
}

export interface SyncRunResult extends JobRunCounters {
  searchesUsed: number;
  cities: string[];
}

/**
 * SerpApi sync as an admin-triggered run.
 *
 * SerpApi bills one credit per search, so `maxSearches` defaults to the monthly
 * budget guard and the run reports per-city progress into `job_runs`.
 */
export async function runClinicSync(options: SyncRunOptions = {}): Promise<SyncRunResult> {
  const { syncAllCities } = await import("@/lib/services/serpapi");
  const maxSearches = options.maxSearches ?? Number(process.env.SERAPI_MAX_SEARCHES ?? 40);
  const delayMs = options.delayMs ?? Number(process.env.SERAPI_DELAY_MS ?? 1500);
  const cityFilter = options.city ? [options.city] : undefined;

  await report(options.jobRunId, {
    total: cityFilter ? cityFilter.length : 10,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    message: `Syncing with ${maxSearches} SerpApi searches`,
  });

  const report_ = await syncAllCities({
    cityFilter,
    delayMs,
    maxSearches,
  });

  const counters: JobRunCounters = {
    total: report_.totalCities,
    processed: report_.details.length,
    succeeded: report_.details.filter((city) => city.fetched > 0).length,
    failed: report_.details.filter((city) => city.fetched === 0).length,
    skipped: 0,
  };

  await report(options.jobRunId, {
    ...counters,
    status: "COMPLETED",
    message: `${report_.totalClinics} clinics from ${report_.searchesUsed} searches`,
  });

  return { ...counters, searchesUsed: report_.searchesUsed, cities: report_.details.map((c) => c.citySlug) };
}

export type { JobRunKind };