import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { locales, localeNames } from "@/lib/i18n/config";
import { getBlogPostByIdDb } from "@/lib/repositories/blog";
import { getCitiesDb } from "@/lib/repositories/cities";
import { getSpecialtiesDb } from "@/lib/repositories/specialties";
import { blogPostPath } from "@/lib/routes";
import { ArticleForm } from "@/components/admin/article-form";
import { AdminPageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Edit article" };

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }, cities, specialties] = await Promise.all([
    params,
    searchParams,
    getCitiesDb(),
    getSpecialtiesDb(),
  ]);

  const post = await getBlogPostByIdDb(id);
  if (!post) notFound();

  // Only offer a "view" link for a post that is actually reachable.
  const liveIn = post.status === "PUBLISHED" ? locales : [];

  return (
    <>
      <AdminPageHeader
        title="Edit article"
        description={
          post.status === "PUBLISHED"
            ? "Live since " +
              (post.publishedAt ? post.publishedAt.slice(0, 10) : "an earlier date") +
              ". Saving refreshes the public page immediately."
            : "This article is a draft and is not visible on the public site."
        }
        action={
          liveIn.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {liveIn.map((locale) => (
                <Link
                  key={locale}
                  href={blogPostPath(locale, post.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-pill border border-border px-3.5 py-1.5 font-semibold text-muted hover:border-primary hover:text-primary"
                >
                  View {localeNames[locale]}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />

      <ArticleForm
        post={post}
        cities={cities.map((city) => ({ slug: city.slug, name: city.name, nameAr: city.nameAr }))}
        specialties={specialties.map((specialty) => ({
          slug: specialty.slug,
          name: specialty.name,
        }))}
        saved={saved === "1"}
      />
    </>
  );
}