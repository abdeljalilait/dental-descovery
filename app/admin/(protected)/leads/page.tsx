import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { AdminPageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Leads" };

const leadRows = () => prisma.orm.public.Lead.orderBy((lead) => lead.createdAt.desc()).limit(200);

type LeadRow = ResultType<ReturnType<typeof leadRows>>;

/**
 * Lead submissions captured by the public forms.
 *
 * Leads are the least sensitive rows in the database, but a read failure must
 * not take the admin down, so the query is isolated and reported in the table.
 */
export default async function AdminLeadsPage() {
  let leads: LeadRow[] = [];
  let error: string | null = null;

  try {
    if (process.env.DATABASE_URL) {
      leads = await leadRows().all();
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
    console.error("[admin/leads] query failed", error);
  }

  return (
    <>
      <AdminPageHeader title="Leads" description="Form submissions from lead modal" />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Could not load leads: {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Plan</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">City</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border last:border-0">
                <td className="p-3 text-muted">{String(lead.createdAt ?? "").split("T")[0]}</td>
                <td className="p-3">{lead.type ?? "-"}</td>
                <td className="p-3">{lead.planKey ?? "-"}</td>
                <td className="p-3 font-medium">{lead.name ?? "-"}</td>
                <td className="p-3">{lead.email ?? "-"}</td>
                <td className="p-3">{lead.phone ?? "-"}</td>
                <td className="p-3">{lead.city ?? "-"}</td>
                <td className="p-3 text-muted">{lead.status ?? "-"}</td>
              </tr>
            ))}
            {leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-muted">
                  No leads yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
