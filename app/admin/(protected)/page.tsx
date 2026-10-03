import Link from "next/link";
import { getBlogPostCountsDb, listPageSeosDb } from "@/lib/repositories/blog";
import { AdminPageHeader } from "@/components/admin/page-header";

export default async function AdminDashboardPage() {
  const [counts, pageSeos] = await Promise.all([getBlogPostCountsDb(), listPageSeosDb()]);

  const stats = [
    { label: "Published articles", value: counts.published },
    { label: "Drafts", value: counts.draft },
    { label: "Page SEO overrides", value: pageSeos.length },
  ];

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Articles and page-level SEO are stored in PostgreSQL and served directly to the public site."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/articles/new"
          className="rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          New article
        </Link>
        <Link
          href="/admin/articles"
          className="rounded-pill border border-border px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
        >
          All articles
        </Link>
        <Link
          href="/admin/seo"
          className="rounded-pill border border-border px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
        >
          Page SEO
        </Link>
      </div>
    </>
  );
}