"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";

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

  useEffect(() => {
    if (run.status !== "RUNNING") return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/jobs/${initialRun.id}`, { cache: "no-store" });
        if (!response.ok) return;
        setRun((await response.json()) as JobRunView);
      } catch {
        // A transient poll failure must not stop the UI from retrying.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [initialRun.id, run.status]);

  const percent = run.total > 0 ? Math.round((run.processed / run.total) * 100) : 0;

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
        {run.processed}/{run.total} processed · {run.succeeded} accepted · {run.failed} failed ·{" "}
        {run.skipped} skipped
      </p>
      {run.message ? <p className="mt-1 text-xs text-muted">{run.message}</p> : null}
    </div>
  );
}