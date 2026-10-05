"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin/auth";
import { getTemplateByKey } from "@/lib/campaign/templates";
import {
  createJobRunDb,
  finishJobRunDb,
  hasRunningJobDb,
  type JobRunKind,
} from "@/lib/repositories/job-runs";
import { cities } from "@/lib/data/cities";
import { sendCampaign } from "@/lib/services/campaign-sender";
import { runClinicSync } from "@/lib/services/clinic-sync";
import {
  MONTHLY_SEARCH_BUDGET,
  PRIMARY_DENTAL_KEYWORDS,
  sanitizeKeywords,
} from "@/lib/services/serpapi";
import {
  clearFinishedJobRunsDb,
  deleteJobRunDb,
  getJobRunDb,
} from "@/lib/repositories/job-runs";

/**
 * Admin-triggered batch jobs (WhatsApp campaign, SerpApi sync).
 *
 * These used to run on a Bree schedule. Nothing runs on a timer any more: an
 * operator starts a run here, the action returns immediately, and the work
 * continues in `after()` while the UI polls `/api/admin/jobs/[id]`. Progress
 * lives in `job_runs`, so a reload mid-run loses nothing.
 */

async function requestedBy(): Promise<string | undefined> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export async function startCampaignAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const templateKey = String(formData.get("templateKey") ?? "");
  const template = await getTemplateByKey(templateKey);
  if (!template) return redirect("/admin/jobs?error=template");

  const city = String(formData.get("city") ?? "").trim() || undefined;
  const rawClaimed = String(formData.get("claimedStatus") ?? "all");
  const claimedStatus = rawClaimed === "claimed" || rawClaimed === "unclaimed" ? rawClaimed : "all";
  const dryRun = formData.get("mode") !== "live";
  const force = formData.get("force") === "on";
  const maxPerRun = Math.max(1, Math.min(Number(formData.get("maxPerRun") ?? 50) || 50, 500));

  if (await hasRunningJobDb("WHATSAPP_CAMPAIGN")) {
    return redirect("/admin/jobs?error=running");
  }

  if (!dryRun) {
    // Live sends are irreversible and billed, so require an explicit opt-in
    // that the dry-run path never sets.
    const confirmed = formData.get("confirmLive") === "yes";
    if (!confirmed) return redirect("/admin/jobs?error=confirm");
  }

  const jobRunId = await createJobRunDb({
    kind: "WHATSAPP_CAMPAIGN" as JobRunKind,
    requestedBy: await requestedBy(),
    params: { templateKey, city: city ?? null, claimedStatus, dryRun, force, maxPerRun },
    message: dryRun ? "Starting dry run" : `Starting live send (${templateKey})`,
  });

  after(async () => {
    try {
      await sendCampaign({ templateKey, city, claimedStatus, dryRun, force, maxPerRun, jobRunId });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await finishJobRunDb(jobRunId, {
        status: "FAILED",
        message: errMsg,
        errors: [errMsg],
      });
    }
  });

  revalidatePath("/admin/jobs");
  return redirect("/admin/jobs?started=campaign");
}

export async function startSyncAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const city = String(formData.get("city") ?? "").trim() || undefined;

  // Keywords arrive as free-form form values and are interpolated into a billable
  // search query, so they are whitelisted against the catalogue. An empty
  // selection falls back to the single primary keyword.
  const keywords = sanitizeKeywords(formData.getAll("keywords"));
  const effectiveKeywords = keywords.length > 0 ? keywords : PRIMARY_DENTAL_KEYWORDS;

  const cityCount = city ? 1 : cities.length;
  const rawMaxSearches = Number(formData.get("maxSearches"));
  // Leave the cap to the core runner when the operator did not set one, so the
  // derived default matches this exact keyword and city selection.
  const maxSearches = Number.isFinite(rawMaxSearches) && rawMaxSearches > 0
    ? Math.min(Math.floor(rawMaxSearches), MONTHLY_SEARCH_BUDGET)
    : Math.min(effectiveKeywords.length * cityCount, MONTHLY_SEARCH_BUDGET);

  if (await hasRunningJobDb("SERPAPI_SYNC")) {
    return redirect("/admin/jobs?error=running");
  }

  const jobRunId = await createJobRunDb({
    kind: "SERPAPI_SYNC" as JobRunKind,
    requestedBy: await requestedBy(),
    params: {
      city: city ?? null,
      maxSearches,
      keywords: effectiveKeywords,
    },
    message: `Starting sync (${city ? `City: ${city}` : `All ${cityCount} cities`}, ${effectiveKeywords.length} keywords, max ${maxSearches} searches)`,
  });

  after(async () => {
    try {
      await runClinicSync({ city, maxSearches, keywords: effectiveKeywords, jobRunId });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await finishJobRunDb(jobRunId, {
        status: "FAILED",
        message: errMsg,
        errors: [errMsg],
      });
    }
  });

  revalidatePath("/admin/jobs");
  return redirect("/admin/jobs?started=sync");
}

/** Delete one run from the recent list. History only, never job state. */
export async function deleteJobRunAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  // A run that is still executing owns real work, so it cannot be deleted out
  // from under the operator while it is in flight.
  const run = await getJobRunDb(id);
  if (!run || run.status === "RUNNING") return;

  await deleteJobRunDb(id);

  revalidatePath("/admin/jobs");
  return redirect("/admin/jobs");
}

/** Clear every finished run, keeping anything still in flight. */
export async function clearFinishedJobRunsAction(): Promise<void> {
  await requireAdmin();

  await clearFinishedJobRunsDb();

  revalidatePath("/admin/jobs");
  return redirect("/admin/jobs");
}