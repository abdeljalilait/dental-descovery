import { AdminPageHeader } from "@/components/admin/page-header";
import { JobProgress, type JobRunView } from "@/components/admin/job-progress";
import { startCampaignAction, startSyncAction } from "@/app/admin/jobs-actions";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign/templates";
import { cities } from "@/lib/data/cities";
import {
  getCampaignDeliverySummaryDb,
  listJobRunsDb,
  reapStaleJobRunsDb,
} from "@/lib/repositories/job-runs";

/**
 * Operator console for the two heavy jobs.
 *
 * Nothing runs on a timer: the campaign and the SerpApi sync are started here,
 * each click creating a `job_runs` row that the panel below polls for progress.
 */

export const metadata = { title: "Jobs — Admin" };
export const dynamic = "force-dynamic";

function toView(run: {
  id: string;
  kind: string;
  status: string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  message: string | null;
  finishedAt: unknown;
}): JobRunView {
  return {
    id: run.id,
    kind: run.kind,
    status: run.status ?? "RUNNING",
    total: run.total ?? 0,
    processed: run.processed ?? 0,
    succeeded: run.succeeded ?? 0,
    failed: run.failed ?? 0,
    skipped: run.skipped ?? 0,
    message: run.message,
    finishedAt: run.finishedAt ? String(run.finishedAt) : null,
  };
}

export default async function AdminJobsPage() {
  // Self-heal: a deploy or crash can leave a run in RUNNING, which would block
  // the operator from starting another one.
  const reaped = await reapStaleJobRunsDb();

  const runs = await listJobRunsDb(12);
  const delivery = await getCampaignDeliverySummaryDb();

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Jobs"
        description="Start the WhatsApp campaign or the SerpApi clinic sync on demand. Progress is written to the database, so it survives a reload."
      />

      {reaped > 0 ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Marked {reaped} abandoned run{reaped > 1 ? "s" : ""} as failed.
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-primary">WhatsApp campaign</h2>
        <p className="mt-1 text-sm text-muted">
          Sends an approved template to clinics that are not on Dental App and have no WhatsApp opt-out.
          Dry run first: it reports exactly who would be contacted without spending a message.
        </p>
        <CampaignForm />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-primary">SerpApi clinic sync</h2>
        <p className="mt-1 text-sm text-muted">
          One SerpApi credit per search. Cap the run below your monthly budget; a full sweep of the
          10 target cities costs 10 searches.
        </p>
        <SyncForm />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-primary">Received so far</h2>
        <p className="mt-1 text-sm text-muted">
          Sent is what WhatsApp accepted; delivered and read come from the Kapso receipt webhook, so
          they are the clinics that actually received the message.
        </p>
        {delivery.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No campaign contacts recorded yet.</p>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {delivery.map((row) => (
              <div key={row.status} className="rounded-xl bg-background p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">{row.status}</dt>
                <dd className="text-2xl font-bold text-primary">{row.count}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Recent runs</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted">No runs yet.</p>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <JobProgress key={run.id} initialRun={toView(run)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CampaignForm() {
  return (
    <form action={startCampaignAction} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Template</span>
          <select
            name="templateKey"
            className="w-full rounded-xl border border-border bg-background px-3 py-2"
            defaultValue={CAMPAIGN_TEMPLATES[0]?.key}
          >
            {CAMPAIGN_TEMPLATES.map((template) => (
              <option key={template.key} value={template.key}>
                {template.name} ({template.key})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">City (optional)</span>
          <select name="city" className="w-full rounded-xl border border-border bg-background px-3 py-2" defaultValue="">
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Max per run</span>
          <input
            name="maxPerRun"
            type="number"
            min={1}
            max={500}
            defaultValue={25}
            className="w-full rounded-xl border border-border bg-background px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Mode</span>
          <select name="mode" className="w-full rounded-xl border border-border bg-background px-3 py-2" defaultValue="dry">
            <option value="dry">Dry run (no messages sent)</option>
            <option value="live">Live send</option>
          </select>
        </label>
      </div>

      <div className="space-y-2 text-sm text-muted">
        <label className="flex items-center gap-2">
          <input name="confirmLive" type="checkbox" value="yes" />
          I confirm the template is approved and I want to send real messages.
        </label>
        <label className="flex items-center gap-2">
          <input name="force" type="checkbox" />
          Re-send to clinics already contacted with this template
        </label>
      </div>

      <button
        type="submit"
        className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Start campaign
      </button>
    </form>
  );
}

function SyncForm() {
  return (
    <form action={startSyncAction} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">City (optional)</span>
          <select name="city" className="w-full rounded-xl border border-border bg-background px-3 py-2" defaultValue="">
            <option value="">All target cities</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Max searches</span>
          <input
            name="maxSearches"
            type="number"
            min={1}
            max={250}
            defaultValue={10}
            className="w-full rounded-xl border border-border bg-background px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Start sync
      </button>
    </form>
  );
}