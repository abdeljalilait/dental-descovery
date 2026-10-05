import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getJobRunDb, parseJobErrors } from "@/lib/repositories/job-runs";

/**
 * Live progress for one admin-triggered run.
 *
 * The UI polls this while a campaign or sync is in flight, which keeps the
 * counters visible after a reload. Session-guarded like every admin read.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const run = await getJobRunDb(id);

  if (!run) {
    return NextResponse.json({ error: "Unknown run" }, { status: 404 });
  }

  const errors = parseJobErrors(run.errors);

  return NextResponse.json({
    id: run.id,
    kind: run.kind,
    status: run.status,
    total: run.total,
    processed: run.processed,
    succeeded: run.succeeded,
    failed: run.failed,
    skipped: run.skipped,
    message: run.message,
    errors,
    createdAt: String(run.createdAt ?? ""),
    finishedAt: run.finishedAt ? String(run.finishedAt) : null,
  });
}