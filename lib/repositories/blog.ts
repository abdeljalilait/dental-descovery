import prisma from "@/lib/prisma";
import { and } from "@prisma/orm-postgres/orm-client";
import type { Locale } from "@/lib/i18n/config";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { toInstant } from "@/src/prisma/codecs";
import type {
  BlogPost,
  BlogPostInput,
  BlogPostRecord,
  BlogPostStatus,
  PageSeoInput,
  PageSeoRecord,
} from "@/lib/data/types";
import { isBlogPostStatus } from "@/lib/data/types";

/**
 * The database is the single source of truth for articles, as it is for
 * clinics, cities and specialties: these queries have no static-seed fallback.
 * `lib/data/blog.ts` exists only to bootstrap the `blog_posts` table via
 * `prisma/seed.mjs`, so a query failure must surface rather than silently
 * serve the six launch posts.
 */

/** `DateTime` columns are `timestamptz` on the temporal codec: render as `YYYY-MM-DD`. */
function toDateOnly(value: unknown): string {
  return String(value ?? "").split("T")[0];
}

/** Full ISO instant, or null when the column is empty. */
function toInstantString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

/** Status is a `text` column, so a row could carry anything; narrow before use. */
function toStatus(value: string): BlogPostStatus {
  return isBlogPostStatus(value) ? value : "DRAFT";
}

/**
 * Shared row projection. Returns every column rather than a hand-listed
 * `select`, so adding an article field cannot silently fall out of the mapper.
 */
const blogPostRows = () => prisma.orm.public.BlogPost;

type BlogPostRow = ResultType<ReturnType<typeof blogPostRows>>;

function mapBlogPostRow(row: BlogPostRow): BlogPostRecord {
  return {
    id: row.id,
    slug: row.slug,
    status: toStatus(row.status),
    title: { fr: row.titleFr, ar: row.titleAr },
    excerpt: { fr: row.excerptFr, ar: row.excerptAr },
    content: { fr: row.contentFr, ar: row.contentAr },
    category: { fr: row.categoryFr, ar: row.categoryAr },
    readTime: row.readTime,
    // A published post always has `publishedAt` (stamped by the publish
    // action); `createdAt` is the safety net for a row that somehow lost it.
    date: toDateOnly(row.publishedAt ?? row.createdAt),
    relatedCitySlug: row.relatedCitySlug,
    relatedSpecialtySlug: row.relatedSpecialtySlug,
    coverImageUrl: row.coverImageUrl,
    metaTitle: { fr: row.metaTitleFr ?? "", ar: row.metaTitleAr ?? "" },
    metaDescription: { fr: row.metaDescriptionFr ?? "", ar: row.metaDescriptionAr ?? "" },
    keywords: { fr: row.keywordsFr ?? "", ar: row.keywordsAr ?? "" },
    ogImageUrl: row.ogImageUrl,
    publishedAt: toInstantString(row.publishedAt),
    createdAt: toInstantString(row.createdAt) ?? "",
    updatedAt: toInstantString(row.updatedAt) ?? "",
  };
}

/**
 * Newest first, with the slug as a tiebreak so ordering is stable when two
 * posts share a publication day.
 */
function byRecency(query: ReturnType<typeof blogPostRows>) {
  return query
    .orderBy((post) => post.publishedAt.desc({ nulls: "last" }))
    .orderBy((post) => post.slug.asc());
}

/**
 * Public article listing: published rows only.
 *
 * Takes no locale: a row carries both translations, so hreflang links, the
 * sitemap and the article list are all served from one query.
 */
export async function getBlogArticlesDb(): Promise<BlogPost[]> {
  const rows = await byRecency(blogPostRows().where((post) => post.status.eq("PUBLISHED"))).all();
  return rows.map(mapBlogPostRow);
}

/**
 * Public article detail, as a full record so `generateMetadata` can read the
 * per-article SEO overrides. Undefined for drafts or unknown slugs.
 */
export async function getBlogArticleBySlugDb(slug: string): Promise<BlogPostRecord | undefined> {
  const row = await blogPostRows()
    .where((post) => and(post.slug.eq(slug), post.status.eq("PUBLISHED")))
    .first();

  return row ? mapBlogPostRow(row) : undefined;
}

/**
 * Every published slug, both locales are derived by the caller. Used by
 * `generateStaticParams` and the sitemap.
 */
export async function getBlogSlugsDb(): Promise<string[]> {
  const rows = await blogPostRows()
    .where((post) => post.status.eq("PUBLISHED"))
    .orderBy((post) => post.slug.asc())
    .all();

  return rows.map((row) => row.slug);
}

/**
 * Published posts carrying a given specialty, most recent first. Backs the
 * "related articles" rail on treatment pages. Filtering in the database uses
 * the `relatedSpecialtySlug` index instead of pulling every post and reducing
 * it in JavaScript.
 */
export async function getBlogArticlesBySpecialtyDb(
  specialtySlug: string,
  limit: number,
): Promise<BlogPost[]> {
  const rows = await byRecency(
    blogPostRows().where((post) =>
      and(post.status.eq("PUBLISHED"), post.relatedSpecialtySlug.eq(specialtySlug)),
    ),
  )
    .limit(limit)
    .all();

  return rows.map(mapBlogPostRow);
}

/** Admin listing: drafts and published alike, newest first. */
export async function getAllBlogPostsDb(): Promise<BlogPostRecord[]> {
  const rows = await byRecency(blogPostRows()).all();
  return rows.map(mapBlogPostRow);
}

/** Admin single-record read, by id. */
export async function getBlogPostByIdDb(id: string): Promise<BlogPostRecord | undefined> {
  const row = await blogPostRows().where({ id }).first();
  return row ? mapBlogPostRow(row) : undefined;
}

/**
 * Flatten an admin input into contract columns.
 *
 * `publishedAt` is deliberately excluded: the caller decides it from the status
 * transition so a browser cannot backdate a post, and the temporal codec
 * requires `toInstant` rather than a JavaScript `Date`.
 */
function toColumns(input: BlogPostInput) {
  return {
    slug: input.slug,
    titleFr: input.title.fr,
    titleAr: input.title.ar,
    excerptFr: input.excerpt.fr,
    excerptAr: input.excerpt.ar,
    contentFr: input.content.fr,
    contentAr: input.content.ar,
    categoryFr: input.category.fr,
    categoryAr: input.category.ar,
    readTime: input.readTime,
    relatedCitySlug: input.relatedCitySlug,
    relatedSpecialtySlug: input.relatedSpecialtySlug,
    coverImageUrl: input.coverImageUrl,
    status: input.status,
    metaTitleFr: input.metaTitle.fr || null,
    metaTitleAr: input.metaTitle.ar || null,
    metaDescriptionFr: input.metaDescription.fr || null,
    metaDescriptionAr: input.metaDescription.ar || null,
    keywordsFr: input.keywords.fr || null,
    keywordsAr: input.keywords.ar || null,
    ogImageUrl: input.ogImageUrl,
  };
}

/** Create an article. Throws on a duplicate slug (unique index). */
export async function createBlogPostDb(input: BlogPostInput): Promise<BlogPostRecord> {
  const row = await blogPostRows().create({
    ...toColumns(input),
    // Publishing stamps the instant; a draft leaves it null until it goes live.
    publishedAt: input.status === "PUBLISHED" ? toInstant(new Date()) : null,
  });

  return mapBlogPostRow(row);
}

/**
 * The publication instant to write for a status change: a post that is already
 * live keeps its original date (so re-saving never re-dates an article), and
 * going from draft to published stamps now. `current.publishedAt` is already
 * decoded by the temporal codec, so it round-trips without re-encoding.
 */
function nextPublishedAt(current: BlogPostRow | null, status: BlogPostStatus) {
  if (status !== "PUBLISHED") return null;
  return current?.publishedAt ?? toInstant(new Date());
}

/**
 * Update an article. Returns undefined when the id does not exist, so the admin
 * can distinguish a missing record from a write failure.
 */
export async function updateBlogPostDb(
  id: string,
  input: BlogPostInput,
): Promise<BlogPostRecord | undefined> {
  const current = await blogPostRows().where({ id }).first();
  if (!current) return undefined;

  const row = await blogPostRows()
    .where({ id })
    .update({ ...toColumns(input), publishedAt: nextPublishedAt(current, input.status) });

  // The row was just read, so a null write result means the delete raced us.
  return row ? mapBlogPostRow(row) : undefined;
}

/** Toggle between draft and published. Stamps the instant on first publish. */
export async function setBlogPostStatusDb(
  id: string,
  status: BlogPostStatus,
): Promise<BlogPostRecord | undefined> {
  const current = await blogPostRows().where({ id }).first();
  if (!current) return undefined;

  const row = await blogPostRows()
    .where({ id })
    .update({ status, publishedAt: nextPublishedAt(current, status) });

  return row ? mapBlogPostRow(row) : undefined;
}

/** Delete an article. Returns false when the id did not exist. */
export async function deleteBlogPostDb(id: string): Promise<boolean> {
  await blogPostRows().where({ id }).delete();
  return true;
}

/* ------------------------------------------------------------------ *
 * Page-level SEO overrides
 * ------------------------------------------------------------------ */

const pageSeoRows = () => prisma.orm.public.PageSeo;

type PageSeoRow = ResultType<ReturnType<typeof pageSeoRows>>;

function mapPageSeoRow(row: PageSeoRow): PageSeoRecord {
  return {
    id: row.id,
    routeKey: row.routeKey,
    // Guard the `text` locale column against a value outside the supported set.
    locale: row.locale === "ar" ? "ar" : "fr",
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    keywords: row.keywords,
    ogImageUrl: row.ogImageUrl,
    canonicalUrl: row.canonicalUrl,
    metaRobots: row.metaRobots,
    createdAt: toInstantString(row.createdAt) ?? "",
    updatedAt: toInstantString(row.updatedAt) ?? "",
  };
}

/**
 * The override for one route in one locale, or undefined when the editor has
 * not set one — which is the signal to fall back to the page defaults.
 */
export async function getPageSeoDb(routeKey: string, locale: Locale): Promise<PageSeoRecord | undefined> {
  const row = await pageSeoRows().where({ routeKey, locale }).first();
  return row ? mapPageSeoRow(row) : undefined;
}

/** Admin listing of every override, ordered for a scannable table. */
export async function listPageSeosDb(): Promise<PageSeoRecord[]> {
  const rows = await pageSeoRows()
    .orderBy((seo) => seo.routeKey.asc())
    .orderBy((seo) => seo.locale.asc())
    .all();

  return rows.map(mapPageSeoRow);
}

/** Create or replace the override for a route/locale pair. */
export async function upsertPageSeoDb(input: PageSeoInput): Promise<PageSeoRecord> {
  const row = await pageSeoRows().upsert({
    conflictOn: { routeKey: input.routeKey, locale: input.locale },
    update: {
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      keywords: input.keywords,
      ogImageUrl: input.ogImageUrl,
      canonicalUrl: input.canonicalUrl,
      metaRobots: input.metaRobots,
    },
    create: {
      routeKey: input.routeKey,
      locale: input.locale,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      keywords: input.keywords,
      ogImageUrl: input.ogImageUrl,
      canonicalUrl: input.canonicalUrl,
      metaRobots: input.metaRobots,
    },
  });

  return mapPageSeoRow(row);
}

/** Remove an override so the page falls back to its built-in metadata. */
export async function deletePageSeoDb(routeKey: string, locale: Locale): Promise<void> {
  await pageSeoRows().where({ routeKey, locale }).delete();
}

/** Count of published vs draft articles, for the admin dashboard. */
export async function getBlogPostCountsDb(): Promise<{ total: number; published: number; draft: number }> {
  const [total, published] = await Promise.all([
    blogPostRows().aggregate((aggregate) => ({ count: aggregate.count() })),
    blogPostRows()
      .where((post) => post.status.eq("PUBLISHED"))
      .aggregate((aggregate) => ({ count: aggregate.count() })),
  ]);

  return {
    total: total.count,
    published: published.count,
    draft: total.count - published.count,
  };
}