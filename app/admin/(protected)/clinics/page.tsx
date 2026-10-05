import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { JobProgress, type JobRunView } from "@/components/admin/job-progress";
import { CLINIC_CSV_COLUMNS } from "@/lib/clinic-csv";
import {
  listAdminCityFacetsDb,
  listAdminClinicsDb,
  type AdminClinicRow,
} from "@/lib/repositories/admin-clinics";
import { getJobRunDb } from "@/lib/repositories/job-runs";
import { listJobRunsDb } from "@/lib/repositories/job-runs";
import { ClinicImportForm } from "@/components/admin/clinic-import-form";
import { SendTemplateControl } from "@/components/admin/send-template-control";
import { ToggleFlagButton } from "@/components/admin/toggle-flag-button";
import { getCampaignTemplatesDb, type CampaignTemplate } from "@/lib/campaign/templates";

/**
 * Every clinic, with the operator tools around it.
 *
 * Pagination happens in the database (`limit`/`offset` in
 * `lib/repositories/admin-clinics.ts`) rather than in memory, so the table stays
 * fast as the directory grows. Filters live in the URL, which keeps a page
 * shareable and makes the export link able to reproduce exactly what is on screen.
 */

export const metadata = { title: "Clinics — Admin" };
export const dynamic = "force-dynamic";

const PER_PAGE_OPTIONS = [25, 50, 100] as const;

export default async function AdminClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; flag?: string; page?: string; perPage?: string }>;
}) {
  const params = await searchParams;

  const perPage = PER_PAGE_OPTIONS.includes(Number(params.perPage) as (typeof PER_PAGE_OPTIONS)[number])
    ? Number(params.perPage)
    : 25;

  const [result, facets, runs, templates] = await Promise.all([
    listAdminClinicsDb({
      query: params.q,
      city: params.city,
      flag: params.flag,
      page: Number(params.page) || 1,
      perPage,
    }),
    listAdminCityFacetsDb(),
    listJobRunsDb(5),
    getCampaignTemplatesDb(),
  ]);

  const queryString = new URLSearchParams({
    ...(params.q ? { q: params.q } : {}),
    ...(params.city ? { city: params.city } : {}),
    ...(params.flag ? { flag: params.flag } : {}),
    perPage: String(perPage),
  });

  const exportHref = `/api/admin/clinics/export?${queryString.toString()}`;
  const pageHref = (page: number) => {
    const next = new URLSearchParams(queryString);
    next.set("page", String(page));
    return `/admin/clinics?${next.toString()}`;
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Clinics"
        description="Browse and edit the full directory. Export produces a CSV in the exact format the importer accepts."
        action={
          <a
            href={exportHref}
            className="rounded-pill border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            Export CSV ({result.total})
          </a>
        }
      />

      <form className="grid gap-3 sm:grid-cols-4" action="/admin/clinics">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search name, slug, phone…"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        />
        <select
          name="city"
          defaultValue={params.city ?? ""}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All cities</option>
          {facets.map((facet) => (
            <option key={facet.citySlug} value={facet.citySlug}>
              {facet.name} ({facet.count})
            </option>
          ))}
        </select>
        <select
          name="flag"
          defaultValue={params.flag ?? ""}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Any status</option>
          <option value="verified">Verified</option>
          <option value="claimed">Claimed</option>
          <option value="usesApp">On Dental App</option>
          <option value="noWhatsapp">No WhatsApp</option>
        </select>
        <select
          name="perPage"
          defaultValue={String(perPage)}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        >
          {PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} / page
            </option>
          ))}
        </select>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Filter
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="p-3">Clinic</th>
              <th className="p-3">City</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Flags</th>
              <th className="p-3">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((clinic) => (
              <ClinicRow key={clinic.id} clinic={clinic} templates={templates} />
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  No clinic matches these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pager
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        perPage={perPage}
        href={pageHref}
      />

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-primary">Import CSV</h2>
        <p className="mt-1 text-sm text-muted">
          Uploads rows keyed on <code className="font-mono">slug</code>: an existing slug is updated,
          a new one is created. Columns: {CLINIC_CSV_COLUMNS.join(", ")}.
        </p>
        <ClinicImportForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Recent runs</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted">No runs yet.</p>
        ) : (
          <div className="space-y-3">
            {runs.map(async (run) => (
              <JobProgress key={run.id} initialRun={await toView(run)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

async function toView(run: Awaited<ReturnType<typeof getJobRunDb>> & object): Promise<JobRunView> {
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

function ClinicRow({
  clinic,
  templates,
}: {
  clinic: AdminClinicRow;
  templates: CampaignTemplate[];
}) {
  const whatsapp = clinic.whatsapp ?? "";

  return (
    <tr className="border-b border-border align-top last:border-0">
      <td className="p-3">
        <p className="font-medium text-foreground">{clinic.name}</p>
        <p className="font-mono text-xs text-muted">{clinic.slug}</p>
        <p className="mt-1 max-w-sm text-xs text-muted">{clinic.addressFr}</p>
        <Link
          href={`/fr/dentistes/${clinic.citySlug}/${clinic.slug}`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-primary hover:underline"
        >
          View profile
        </Link>
      </td>
      <td className="p-3">{clinic.citySlug}</td>
      <td className="p-3 text-xs">
        {clinic.phone ? <p>{clinic.phone}</p> : <p className="text-muted">No phone</p>}
        {clinic.email ? <p className="text-muted">{clinic.email}</p> : null}
        {clinic.website ? (
          <a href={clinic.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Website
          </a>
        ) : null}
      </td>
      <td className="p-3">
        {clinic.rating.toFixed(1)}
        <span className="text-muted"> ({clinic.reviewCount})</span>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1">
          <ToggleFlagButton slug={clinic.slug} field="usesApp" value={clinic.usesApp} label="App" />
          <ToggleFlagButton slug={clinic.slug} field="verified" value={clinic.verified} label="Verified" />
        </div>
      </td>
      <td className="p-3">
        {whatsapp ? (
          <SendTemplateControl slug={clinic.slug} whatsapp={whatsapp} templates={templates} />
        ) : (
          <span className="text-xs text-muted">No WhatsApp</span>
        )}
      </td>
    </tr>
  );
}

function Pager({
  page,
  pageCount,
  total,
  perPage,
  href,
}: {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  href: (page: number) => string;
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-pill border border-border px-3 py-1 hover:border-primary">
            Previous
          </Link>
        ) : null}
        <span className="font-medium text-foreground">
          Page {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Link href={href(page + 1)} className="rounded-pill border border-border px-3 py-1 hover:border-primary">
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}