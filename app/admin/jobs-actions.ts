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
import { runClinicSync, sendCampaign } from "@/lib/services/campaign-sender";

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
      await finishJobRunDb(jobRunId, {
        status: "FAILED",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  revalidatePath("/admin/jobs");
  return redirect("/admin/jobs?started=campaign");
}

export async function startSyncAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const city = String(formData.get("city") ?? "").trim() || undefined;
  // SerpApi bills one credit per search, so cap the run explicitly.
  const maxSearches = Math.max(1, Math.min(Number(formData.get("maxSearches") ?? 10) || 10, 250));

  if (await hasRunningJobDb("SERPAPI_SYNC")) {
    return redirect("/admin/jobs?error=running");
  }

  const jobRunId = await createJobRunDb({
    kind: "SERPAPI_SYNC" as JobRunKind,
    requestedBy: await requestedBy(),
    params: { city: city ?? null, maxSearches },
    message: `Starting sync (max ${maxSearches} searches)`,
  });

  after(async () => {
    try {
      await runClinicSync({ city, maxSearches, jobRunId });
    } catch (error) {
      await finishJobRunDb(jobRunId, {
        status: "FAILED",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  revalidatePath("/admin/jobs");
  return redirect("/admin/jobs?started=sync");
}