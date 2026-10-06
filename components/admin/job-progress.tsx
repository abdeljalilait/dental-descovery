"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AlertCircle, Building2, ChevronDown } from "lucide-react";
import { SyncedClinicsModal } from "@/components/admin/synced-clinics-modal";
import type { SyncedClinicSummary } from "@/lib/repositories/job-runs";

export interface JobRunView {
  id: string;
  kind: string;
  status: string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  message: string | null;
  errors?: string[] | null;
  syncedClinics?: SyncedClinicSummary[] | null;
  searchQueries?: string[] | null;
  finishedAt: string | null;
}

const POLL_INTERVAL_MS = 2000;

/**
 * Poll one run while it is in flight.
 *
 * The counts come from the database, not from the starting request, so a
 * refresh mid-campaign resumes reporting instead of losing the batch.
 */
export function JobProgress({ initialRun }: { initialRun: JobRunView }) {
  const [run, setRun] = useState(initialRun);
  const [showClinicsModal, setShowClinicsModal] = useState(false);
  const [showErrors, setShowErrors] = useState(
    (initialRun.failed > 0 || initialRun.status === "FAILED") &&
      Boolean(initialRun.errors?.length || initialRun.message),
  );

  useEffect(() => {
    if (run.status !== "RUNNING") return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/jobs/${initialRun.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as JobRunView;
        setRun(data);
        if (data.failed > 0 || (data.errors && data.errors.length > 0)) {
          setShowErrors(true);
        }
        if (
          data.status === "COMPLETED" &&
          run.status === "RUNNING" &&
          data.syncedClinics &&
          data.syncedClinics.length > 0
        ) {
          setShowClinicsModal(true);
        }
      } catch {
        // A transient poll failure must not stop the UI from retrying.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [initialRun.id, run.status]);

  const percent = run.total > 0 ? Math.round((run.processed / run.total) * 100) : 0;

  const errorList: string[] =
    run.errors && run.errors.length > 0
      ? run.errors
      : run.failed > 0 && run.message
        ? [run.message]
        : run.status === "FAILED" && run.message
          ? [run.message]
          : run.failed > 0
            ? [`${run.failed} item(s) failed during execution.`]
            : [];

  const hasErrors = errorList.length > 0 || run.failed > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted">{run.id.slice(0, 8)}</span>
        <span
          className={
            run.status === "FAILED"
              ? "rounded-pill bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700"
              : run.status === "COMPLETED"
                ? "rounded-pill bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                : "rounded-pill bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
          }
        >
          {run.status}
        </span>
      </div>

      <ProgressBar percent={percent} />

      <p className="mt-2 text-sm text-muted">
        {run.processed}/{run.total} processed · {run.succeeded} accepted ·{" "}
        <span className={run.failed > 0 ? "font-semibold text-red-600" : ""}>
          {run.failed} failed
        </span>{" "}
        · {run.skipped} skipped
      </p>

      {run.message ? <p className="mt-1 text-xs text-muted">{run.message}</p> : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {run.syncedClinics && run.syncedClinics.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowClinicsModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft/80 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary-soft hover:border-primary/40 transition-colors shadow-2xs"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span>Voir les cliniques synchronisées ({run.syncedClinics.length})</span>
          </button>
        ) : null}

        {hasErrors && !showErrors ? (
          <button
            type="button"
            onClick={() => setShowErrors(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
            <span>Show errors ({errorList.length})</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {hasErrors && showErrors ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-900">
          <div className="flex items-center justify-between gap-2 font-semibold">
            <div className="flex items-center gap-1.5 text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>Error details ({errorList.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowErrors(false)}
              className="text-xs text-red-700 hover:text-red-900 underline"
            >
              Hide
            </button>
          </div>
          <ul className="mt-2 space-y-1.5 font-mono text-xs text-red-900 max-h-60 overflow-y-auto">
            {errorList.map((err, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg bg-white/80 p-2 border border-red-100 shadow-xs"
              >
                <span className="text-red-500 font-bold shrink-0">•</span>
                <span className="flex-1 break-words">{err}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {run.syncedClinics && run.syncedClinics.length > 0 ? (
        <SyncedClinicsModal
          open={showClinicsModal}
          onOpenChange={setShowClinicsModal}
          clinics={run.syncedClinics}
          searchQueries={run.searchQueries ?? []}
          jobMessage={run.message}
        />
      ) : null}
    </div>
  );
}