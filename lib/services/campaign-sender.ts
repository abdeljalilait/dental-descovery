import { getTemplateByKey } from "@/lib/campaign/templates";
import { cities } from "@/lib/data/cities";
import { db } from "@/src/prisma/db";
import { toInstant, type InstantInput } from "@/src/prisma/codecs";
import {
  type JobRunCounters,
  type JobRunProgress,
  type JobRunStatus,
  updateJobRunProgressDb,
} from "@/lib/repositories/job-runs";
import { toWhatsApp } from "@/lib/utils/phone";
import { sendWhatsAppViaKapso } from "@/lib/services/whatsapp-kapso";
import {
  resolveClinicVariables,
  renderTemplateBody,
  buildMetaParameters,
} from "@/lib/campaign/variables";

/**
 * Batch runners started from `/admin/jobs`.
 */
export interface CampaignSendOptions {
  dryRun?: boolean;
  city?: string;
  templateKey?: string;
  claimedStatus?: "all" | "claimed" | "unclaimed";
  /** Re-send even if the clinic already has a SENT/DELIVERED/READ row. */
  force?: boolean;
  maxPerRun?: number;
  delayMs?: number;
  /** Restrict the run to these clinic slugs. */
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

interface Candidate {
  id: string;
  slug: string;
  name: string;
  citySlug: string;
  whatsapp: string;
  e164: string;
  alreadyContacted: boolean;
  claimed: boolean;
}

async function loadCandidates(
  city: string | undefined,
  templateKey: string,
  clinicSlugs?: string[],
  claimedStatus?: "all" | "claimed" | "unclaimed",
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
    if (claimedStatus === "claimed" && !clinic.claimed) return false;
    if (claimedStatus === "unclaimed" && clinic.claimed) return false;
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
      claimed: clinic.claimed,
    });
  }

  return { candidates, optedOut, totalNoWhatsapp, totalAlready };
}

/**
 * Eligibility preview for the admin UI.
 */
export async function previewCampaign(
  options: {
    city?: string;
    templateKey: string;
    claimedStatus?: "all" | "claimed" | "unclaimed";
    limit?: number;
  },
): Promise<CampaignPreview> {
  const template = await getTemplateByKey(options.templateKey);
  if (!template) {
    throw new Error(`Template not found: "${options.templateKey}". Please sync your approved WhatsApp templates in /admin/kapso.`);
  }

  const metaTemplateName = template.templateName || template.name;

  const { candidates, optedOut, totalNoWhatsapp, totalAlready } = await loadCandidates(
    options.city,
    metaTemplateName,
    undefined,
    options.claimedStatus,
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
      const vars = resolveClinicVariables({
        name: candidate.name,
        citySlug: candidate.citySlug,
        slug: candidate.slug,
        whatsapp: candidate.whatsapp,
      });
      return {
        clinicName: candidate.name,
        cityName: cityName(candidate.citySlug),
        whatsapp: candidate.e164,
        message: renderTemplateBody(template.body, vars, template.variables),
      };
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
 */
export async function sendCampaign(options: CampaignSendOptions = {}): Promise<CampaignSendResult> {
  const dryRun = options.dryRun ?? process.env.CAMPAIGN_DRY_RUN !== "false";
  const force = options.force ?? false;
  const maxPerRun = options.maxPerRun ?? Number(process.env.CAMPAIGN_MAX_PER_RUN ?? 50);
  const delayMs = options.delayMs ?? Number(process.env.CAMPAIGN_DELAY_MS ?? 2000);
  const templateKey = options.templateKey;

  if (!templateKey) {
    throw new Error("No template selected. Please sync and select an approved template from Kapso.");
  }

  const template = await getTemplateByKey(templateKey);
  if (!template) {
    throw new Error(`Template not found: "${templateKey}". Please sync your approved WhatsApp templates in /admin/kapso.`);
  }

  const metaTemplateName = template.templateName || template.name;

  const { candidates, optedOut } = await loadCandidates(
    options.city,
    metaTemplateName,
    options.clinicSlugs,
    options.claimedStatus,
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
    message: dryRun ? "Dry run: nothing is sent to Kapso" : `Sending template ${template.name}`,
  });

  for (const candidate of selected) {
    const vars = resolveClinicVariables({
      name: candidate.name,
      citySlug: candidate.citySlug,
      slug: candidate.slug,
      whatsapp: candidate.whatsapp,
    });

    if (dryRun) {
      counters.skipped++;
      counters.processed++;
      await report(options.jobRunId, { ...counters });
      continue;
    }

    const parameters = buildMetaParameters(template.variables, vars);

    const res = await sendWhatsAppViaKapso({
      to: candidate.e164,
      template: metaTemplateName,
      language: template.locale,
      variables: parameters,
      accountId: template.accountId,
    });

    if (res.ok) {
      counters.succeeded++;
      try {
        await upsertOutreach(candidate.id, metaTemplateName, {
          status: "SENT",
          providerMessageId: res.messageId,
          sentAt: toInstant(new Date()),
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${candidate.name} (${candidate.slug}): ${errorMsg}`);
      }
    } else {
      counters.failed++;
      const errorMsg = res.error ?? "unknown error";
      errors.push(`${candidate.name} (${candidate.slug}): ${errorMsg}`);
      try {
        await upsertOutreach(candidate.id, metaTemplateName, {
          status: "FAILED",
          note: errorMsg,
          failedAt: toInstant(new Date()),
        });
      } catch {
        // Bookkeeping failure does not abort the batch
      }
    }

    counters.processed++;
    await report(options.jobRunId, {
      ...counters,
      errors: errors.length > 0 ? errors : undefined,
    });

    if (delayMs > 0) await sleep(delayMs);
  }

  const result: CampaignSendResult = {
    ...counters,
    eligible: eligible.length,
    errors,
  };

  const status: JobRunStatus =
    counters.total > 0 && counters.failed === counters.total ? "FAILED" : "COMPLETED";

  await report(options.jobRunId, {
    ...counters,
    status,
    message: dryRun
      ? `Dry run finished: ${counters.total} prospective clinics inspected`
      : `Send complete: ${counters.succeeded} sent, ${counters.failed} failed`,
    errors: errors.length > 0 ? errors : undefined,
  });

  return result;
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

  await report(options.jobRunId, {
    ...counters,
    status,
    message: `${report_.totalClinics} clinics from ${report_.searchesUsed} searches`,
    errors: syncErrors.length > 0 ? syncErrors : undefined,
  });

  return { ...counters, searchesUsed: report_.searchesUsed, cities: report_.details.map((c) => c.citySlug) };
}