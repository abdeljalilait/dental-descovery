"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { getTemplateByKey } from "@/lib/campaign/templates";
import { parseClinicsCsv, toImportRows } from "@/lib/clinic-csv";
import {
  importClinicsDb,
  setClinicUsesAppDb,
  setClinicVerifiedDb,
} from "@/lib/repositories/admin-clinics";
import { createJobRunDb, hasRunningJobDb } from "@/lib/repositories/job-runs";
import { sendCampaign } from "@/lib/services/campaign-sender";

/**
 * Admin clinic management: bulk CSV import, quick flags and single-clinic
 * WhatsApp sends.
 *
 * Every action re-checks the session. A server action is reachable directly by a
 * crafted request, so the layout guard cannot be relied on here.
 */

export interface ImportReport {
  created: number;
  updated: number;
  errors: { line: number; reason: string }[];
}

export async function importClinicsAction(
  _prev: ImportReport | null,
  formData: FormData,
): Promise<ImportReport> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { created: 0, updated: 0, errors: [{ line: 0, reason: "Choose a CSV file to import" }] };
  }

  // The file is an operator upload and every row is upserted, so cap the size
  // rather than buffering an unbounded file in memory.
  if (file.size > 8 * 1024 * 1024) {
    return { created: 0, updated: 0, errors: [{ line: 0, reason: "File is larger than 8 MB" }] };
  }

  const parsed = parseClinicsCsv(await file.text());
  const rows = toImportRows(parsed.rows);

  if (rows.length === 0) {
    return {
      created: 0,
      updated: 0,
      errors: parsed.errors.length
        ? parsed.errors
        : [{ line: 0, reason: "No clinic rows found in the file" }],
    };
  }

  const report = await importClinicsDb(rows);

  revalidatePath("/admin/clinics");
  for (const city of new Set(rows.map((row) => row.citySlug))) {
    if (!city) continue;
    for (const locale of ["fr", "ar"]) {
      revalidatePath(`/${locale}/dentistes/${city}`);
    }
  }

  return {
    created: report.created,
    updated: report.updated,
    errors: [...parsed.errors, ...report.errors],
  };
}

export async function toggleClinicFlagAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const field = String(formData.get("field") ?? "");
  const value = String(formData.get("value") ?? "") === "true";
  if (!slug) return;

  if (field === "usesApp") await setClinicUsesAppDb(slug, value);
  else if (field === "verified") await setClinicVerifiedDb(slug, value);

  revalidatePath("/admin/clinics");
  for (const locale of ["fr", "ar"]) revalidatePath(`/${locale}/dentistes`);
}

/**
 * Send one approved template to a single clinic.
 *
 * Reuses the campaign runner so the send path, the outreach bookkeeping and the
 * progress row are identical to a bulk run; only the candidate list differs.
 */
export async function sendClinicTemplateAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const templateKey = String(formData.get("templateKey") ?? "");
  const live = String(formData.get("mode") ?? "dry") === "live";

  if (!slug) return;
  const template = await getTemplateByKey(templateKey);
  if (!template) {
    throw new Error("Unknown template");
  }

  // A live send is irreversible and billed, so it must be confirmed explicitly.
  if (live && formData.get("confirmLive") !== "yes") {
    throw new Error("Live sends must be confirmed");
  }

  if (await hasRunningJobDb("WHATSAPP_CAMPAIGN")) {
    throw new Error("Another campaign is running; wait for it to finish");
  }

  const jobRunId = await createJobRunDb({
    kind: "WHATSAPP_CAMPAIGN",
    params: { templateKey, clinicSlug: slug, dryRun: !live },
    message: `Queued ${templateKey} for ${slug}`,
  });

  after(async () => {
    const { finishJobRunDb } = await import("@/lib/repositories/job-runs");
    try {
      await sendCampaign({
        templateKey,
        dryRun: !live,
        // Bypass the prospect filter: this is an explicit per-clinic action.
        force: true,
        clinicSlugs: [slug],
        maxPerRun: 1,
        jobRunId,
      });
    } catch (error) {
      await finishJobRunDb(jobRunId, {
        status: "FAILED",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  revalidatePath("/admin/clinics");
}