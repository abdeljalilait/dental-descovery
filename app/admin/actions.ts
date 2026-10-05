"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { locales } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/config";
import { routes, localizedPath, type RouteKey } from "@/lib/routes";
import {
  createBlogPostDb,
  deleteBlogPostDb,
  deletePageSeoDb,
  getBlogPostByIdDb,
  setBlogPostStatusDb,
  updateBlogPostDb,
  upsertPageSeoDb,
  upsertPageBlockDb,
  deletePageBlockDb,
} from "@/lib/repositories/blog";
import type { BlogPostInput, PageSeoInput } from "@/lib/data/types";
import type { PageBlockInput } from "@/lib/repositories/blog";
import { isBlogPostStatus } from "@/lib/data/types";
import {
  endAdminSession,
  isAdminConfigured,
  requireAdmin,
  startAdminSession,
  verifyAdminPassword,
} from "@/lib/admin/auth";
import { clearAttempts, isThrottled, recordFailedAttempt } from "@/lib/admin/rate-limit";

/**
 * Every action re-checks the session. A layout guard protects renders, but a
 * server action is a separate entry point that can be invoked directly by a
 * crafted request, so the check is repeated here rather than assumed.
 */

/** Client IP, for throttling. Falls back to a shared key behind a proxy. */
async function throttleKey(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || store.get("x-real-ip") || "unknown";
}

/**
 * Revalidate everything an article change can affect.
 *
 * The admin runs inside the same Next.js process as the public pages, so it can
 * invalidate the cache directly — no webhook and no external CMS callback.
 */
function revalidateBlog(slugs: string[]): void {
  for (const locale of locales) {
    revalidatePath(`/${locale}/blog`);
  }
  for (const slug of slugs) {
    for (const locale of locales) {
      revalidatePath(`/${locale}/blog/${slug}`);
    }
  }
  // A new or deleted post changes the sitemap's blog entries.
  revalidatePath("/sitemap.xml");
}

/** Revalidate the route only, plus a page-level SEO override when one changed. */
function revalidateListing(routeKey?: string): void {
  for (const locale of locales) {
    if (routeKey) {
      if (routeKey in routes) {
        revalidatePath(localizedPath(routeKey as RouteKey, locale));
      } else {
        revalidatePath(`/${locale}/${routeKey}`);
      }
    } else {
      revalidatePath(`/${locale}/blog`);
    }
  }
  if (routeKey) revalidatePath("/sitemap.xml");
}

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!isAdminConfigured()) {
    return { error: "Admin access is not configured on this server." };
  }

  const key = await throttleKey();
  if (isThrottled(key)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  if (!verifyAdminPassword(password)) {
    recordFailedAttempt(key);
    return { error: "Incorrect password." };
  }

  clearAttempts(key);
  await startAdminSession();

  // Only allow same-origin relative paths, so `?next=` cannot be used as an
  // open redirect to another host.
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ *
 * Article CRUD
 * ------------------------------------------------------------------ */

/** Trim, and collapse an empty string to null for the nullable text columns. */
function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function optional(formData: FormData, field: string): string | null {
  return text(formData, field) || null;
}

/** Build a validated `BlogPostInput` from the submitted form. */
function parsePostInput(formData: FormData): BlogPostInput | { error: string } {
  const slug = text(formData, "slug")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return { error: "A slug is required." };

  const status = text(formData, "status");
  if (!isBlogPostStatus(status)) return { error: "Unknown status." };

  const titleFr = text(formData, "titleFr");
  const titleAr = text(formData, "titleAr");
  if (!titleFr || !titleAr) return { error: "Both French and Arabic titles are required." };

  const contentFr = String(formData.get("contentFr") ?? "");
  const contentAr = String(formData.get("contentAr") ?? "");
  if (!contentFr.trim() || !contentAr.trim()) {
    return { error: "Both French and Arabic article bodies are required." };
  }

  const readTime = Number(text(formData, "readTime"));
  if (!Number.isFinite(readTime) || readTime < 1 || readTime > 120) {
    return { error: "Reading time must be between 1 and 120 minutes." };
  }

  // Normalise blank optional relation fields to null rather than empty strings,
  // which would never match the `relatedCitySlug` / `relatedSpecialtySlug` indexes.
  const city = optional(formData, "relatedCitySlug");
  const specialty = optional(formData, "relatedSpecialtySlug");

  return {
    slug,
    status,
    title: { fr: titleFr, ar: titleAr },
    excerpt: { fr: text(formData, "excerptFr"), ar: text(formData, "excerptAr") },
    content: { fr: contentFr, ar: contentAr },
    category: { fr: text(formData, "categoryFr"), ar: text(formData, "categoryAr") },
    readTime: Math.round(readTime),
    relatedCitySlug: city,
    relatedSpecialtySlug: specialty,
    coverImageUrl: optional(formData, "coverImageUrl"),
    metaTitle: { fr: text(formData, "metaTitleFr"), ar: text(formData, "metaTitleAr") },
    metaDescription: {
      fr: text(formData, "metaDescriptionFr"),
      ar: text(formData, "metaDescriptionAr"),
    },
    keywords: { fr: text(formData, "keywordsFr"), ar: text(formData, "keywordsAr") },
    ogImageUrl: optional(formData, "ogImageUrl"),
  };
}

export interface ArticleFormState {
  error?: string;
  saved?: boolean;
}

/** Create or update, depending on whether an id was submitted. */
export async function savePostAction(
  _prev: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  await requireAdmin();

  const parsed = parsePostInput(formData);
  if ("error" in parsed) return parsed;

  const id = text(formData, "id");

  try {
    if (id) {
      const updated = await updateBlogPostDb(id, parsed);
      if (!updated) return { error: "That article no longer exists." };
      // Revalidate the old slug too: the slug is editable, so the previous URL
      // may now be a 404 in the cache.
      revalidateBlog([parsed.slug]);
    } else {
      const created = await createBlogPostDb(parsed);
      revalidateBlog([created.slug]);
      redirect(`/admin/articles/${created.id}?saved=1`);
    }
  } catch (error) {
    // The slug has a unique index; surface that rather than a raw driver error.
    if (error instanceof Error && /unique|constraint/i.test(error.message)) {
      return { error: `The slug "${parsed.slug}" is already used by another article.` };
    }
    throw error;
  }

  return { saved: true };
}

/** Publish or unpublish. */
export async function toggleStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!isBlogPostStatus(status)) return;

  const record = await setBlogPostStatusDb(id, status);
  if (record) revalidateBlog([record.slug]);
}

/** Delete an article. */
export async function deletePostAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = text(formData, "id");
  const record = await getBlogPostByIdDb(id);
  if (!record) return;

  await deleteBlogPostDb(id);
  revalidateBlog([record.slug]);
  redirect("/admin/articles");
}

/* ------------------------------------------------------------------ *
 * Page-level SEO
 * ------------------------------------------------------------------ */

export interface PageSeoFormState {
  error?: string;
  saved?: boolean;
}

export async function savePageSeoAction(
  _prev: PageSeoFormState,
  formData: FormData,
): Promise<PageSeoFormState> {
  await requireAdmin();

  const routeKey = text(formData, "routeKey");
  if (!routeKey) return { error: "A route key is required." };

  const locale = text(formData, "locale");
  if (!isLocale(locale)) return { error: "Locale must be fr or ar." };

  const input: PageSeoInput = {
    routeKey,
    locale,
    metaTitle: optional(formData, "metaTitle"),
    metaDescription: optional(formData, "metaDescription"),
    keywords: optional(formData, "keywords"),
    ogImageUrl: optional(formData, "ogImageUrl"),
    canonicalUrl: optional(formData, "canonicalUrl"),
    metaRobots: optional(formData, "metaRobots"),
  };

  await upsertPageSeoDb(input);
  revalidateListing(routeKey);

  return { saved: true };
}

export async function deletePageSeoAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const routeKey = text(formData, "routeKey");
  const locale = text(formData, "locale");
  if (!routeKey || !isLocale(locale)) return;

  await deletePageSeoDb(routeKey, locale);
  revalidateListing(routeKey);
}
/* ------------------------------------------------------------------ *
 * Page content blocks (editable copy)
 * ------------------------------------------------------------------ */

export interface PageBlockFormState {
  error?: string;
  saved?: boolean;
}

export async function savePageBlockAction(
  _prev: PageBlockFormState,
  formData: FormData,
): Promise<PageBlockFormState> {
  await requireAdmin();

  const routeKey = text(formData, "routeKey");
  const blockKey = text(formData, "blockKey");
  if (!routeKey || !blockKey) return { error: "routeKey and blockKey are required." };

  const locale = text(formData, "locale");
  if (!isLocale(locale)) return { error: "Locale must be fr or ar." };

  const input: PageBlockInput = {
    routeKey,
    locale,
    blockKey,
    title: optional(formData, "title"),
    subtitle: optional(formData, "subtitle"),
    content: optional(formData, "content"),
  };

  await upsertPageBlockDb(input);
  revalidateListing(routeKey);

  return { saved: true };
}

export async function deletePageBlockAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const routeKey = text(formData, "routeKey");
  const blockKey = text(formData, "blockKey");
  const locale = text(formData, "locale");
  if (!routeKey || !blockKey || !isLocale(locale)) return;

  await deletePageBlockDb(routeKey, locale, blockKey);
  revalidateListing(routeKey);
}
