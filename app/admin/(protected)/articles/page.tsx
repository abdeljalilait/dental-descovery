import Link from "next/link";
import type { Metadata } from "next";
import { getAllBlogPostsDb } from "@/lib/repositories/blog";
import { getDirectoryStatsDb } from "@/lib/repositories/stats";
import { AdminPageHeader } from "@/components/admin/page-header";
import { toggleStatusAction, deletePostAction } from "../../actions";

export const metadata: Metadata = { title: "Articles" };

function StatusPill({ status }: { status: string }) {
  const published = status === "PUBLISHED";
  return (
    <span
      className={
        published
          ? "rounded-pill bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
          : "rounded-pill bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
      }
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [posts, stats] = await Promise.all([getAllBlogPostsDb(), getDirectoryStatsDb()]);

  // Filtered in the query rather than paginated: an editor needs to see every
  // article, and the table is a few dozen rows at most.
  const visible =
    status === "DRAFT" ? posts.filter((post) => post.status === "DRAFT") : posts;

  const filters = [
    { label: "All", value: "" },
    { label: `Published (${posts.filter((p) => p.status === "PUBLISHED").length})`, value: "PUBLISHED" },
    { label: `Drafts (${posts.filter((p) => p.status === "DRAFT").length})`, value: "DRAFT" },
  ];

  return (
    <>
      <AdminPageHeader
        title="Articles"
        description={`${visible.length} article${visible.length === 1 ? "" : "s"}. Articles are shared across both languages: one slug, one record, two translations.`}
        action={
          <Link
            href="/admin/articles/new"
            className="rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            New article
          </Link>
        }
      />

      <div className="mb-5 flex items-center gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.value || "all"}
            href={filter.value ? `/admin/articles?status=${filter.value}` : "/admin/articles"}
            className={
              (status ?? "") === filter.value
                ? "rounded-pill bg-primary px-3.5 py-1.5 text-xs font-semibold text-white"
                : "rounded-pill border border-border px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-primary hover:text-primary"
            }
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-12 text-center text-sm text-muted">
          No articles match this filter.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-subtle text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((post) => (
                <tr key={post.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/articles/${post.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {post.title.fr}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {post.slug} · {post.title.ar}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={post.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{post.date}</td>
                  <td className="px-4 py-3 text-muted">{post.category.fr || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <form action={toggleStatusAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                        />
                        <button
                          type="submit"
                          className="rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-primary hover:text-primary"
                        >
                          {post.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </button>
                      </form>

                      <Link
                        href={`/admin/articles/${post.id}`}
                        className="rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-primary hover:text-primary"
                      >
                        Edit
                      </Link>

                      <form action={deletePostAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <button
                          type="submit"
                          className="rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Deleting an article also purges it from the sitemap and both language listings.
        The directory currently holds {stats.clinicCount} clinics, which articles do not affect.
      </p>
    </>
  );
}