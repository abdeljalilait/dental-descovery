import { AdminPageHeader } from "@/components/admin/page-header";
import { JobProgress, type JobRunView } from "@/components/admin/job-progress";
import {
  KeywordPicker,
  type KeywordGroup,
  type KeywordPickerAccount,
} from "@/components/admin/keyword-picker";
import {
  clearFinishedJobRunsAction,
  deleteJobRunAction,
  startCampaignAction,
  startSyncAction,
} from "@/app/admin/jobs-actions";
import { getCampaignTemplatesDb, type CampaignTemplate } from "@/lib/campaign/templates";
import { cities } from "@/lib/data/cities";
import { getSerpApiAccountInfo } from "@/lib/services/serpapi";
import { DENTAL_KEYWORD_GROUPS } from "@/lib/services/serpapi-core.mjs";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  getCampaignDeliverySummaryDb,
  listJobRunsDb,
  parseJobErrors,
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
  errors?: unknown;
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
    errors: parseJobErrors(run.errors),
    finishedAt: run.finishedAt ? String(run.finishedAt) : null,
  };
}

export default async function AdminJobsPage() {
  // Self-heal: a deploy or crash can leave a run in RUNNING, which would block
  // the operator from starting another one.
  const reaped = await reapStaleJobRunsDb();

  const runs = await listJobRunsDb(12);
  const delivery = await getCampaignDeliverySummaryDb();
  const templates = await getCampaignTemplatesDb();

  // Free (0 credits) quota check so the keyword picker can price a run before
  // it is started. Null when the key is absent or invalid.
  const serpApiAccount = await getSerpApiAccountInfo(process.env.SERPAPI_API_KEY);

  const hasFinishedRuns = runs.some((run) => run.status !== "RUNNING");

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
        <CampaignForm templates={templates} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-primary">SerpApi clinic sync</h2>
        <p className="mt-1 text-sm text-muted">
          One SerpApi credit per search, so a run costs one credit per keyword for each city it
          touches. The estimate below updates as you pick.
        </p>
        <SyncForm groups={DENTAL_KEYWORD_GROUPS} account={serpApiAccount} />
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Recent runs</h2>
          {hasFinishedRuns ? (
            <form action={clearFinishedJobRunsAction}>
              <button
                type="submit"
                className="rounded-pill border border-border px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-red-300 hover:text-red-600"
              >
                Clear finished
              </button>
            </form>
          ) : null}
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-muted">No runs yet.</p>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div key={run.id} className="space-y-1">
                <JobProgress initialRun={toView(run)} />
                {run.status === "RUNNING" ? null : (
                  <form action={deleteJobRunAction} className="flex justify-end">
                    <input type="hidden" name="id" value={run.id} />
                    <button
                      type="submit"
                      className="rounded-pill border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          Deleting a run only clears its history. Clinics, leads and outreach records are never
          touched. A run that is still executing cannot be deleted.
        </p>
      </section>
    </div>
  );
}

function CampaignForm({ templates }: { templates: CampaignTemplate[] }) {
  const hasTemplates = templates.length > 0;

  return (
    <form action={startCampaignAction} className="mt-4 space-y-4">
      {!hasTemplates ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">No WhatsApp templates available</p>
          <p className="mt-1">
            You need to sync approved WhatsApp templates from your Kapso account before launching a campaign.
          </p>
          <Link
            href="/admin/kapso"
            className="mt-3 inline-block rounded-pill bg-primary px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Go to WhatsApp settings &rarr;
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Template</span>
          <select
            name="templateKey"
            disabled={!hasTemplates}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 disabled:opacity-50"
            defaultValue={templates[0]?.key}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.key}>
                {template.name}
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
          <span className="mb-1 block font-medium">Claim status filter</span>
          <select name="claimedStatus" className="w-full rounded-xl border border-border bg-background px-3 py-2" defaultValue="all">
            <option value="all">All clinics</option>
            <option value="claimed">Claimed clinics only</option>
            <option value="unclaimed">Unclaimed clinics only</option>
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

      <SubmitButton
        loadingText="Démarrage de la campagne..."
        disabled={!hasTemplates}
        className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
      >
        Start campaign
      </SubmitButton>
    </form>
  );
}

function SyncForm({
  groups,
  account,
}: {
  groups: KeywordGroup[];
  account: KeywordPickerAccount;
}) {
  return (
    <form action={startSyncAction} className="mt-4 space-y-4">
      <KeywordPicker groups={groups} cities={cities} account={account} />

      <SubmitButton
        loadingText="Démarrage de la synchronisation..."
        className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Start sync
      </SubmitButton>
    </form>
  );
}