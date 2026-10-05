import type { Locale } from "@/lib/i18n/config";

export type LocalizedText = Record<Locale, string>;
export type LeadType = "app-demo" | "website-quote" | "clinic-claim" | "contact";

export interface City {
  slug: string;
  name: string;
  nameAr: string;
  region: LocalizedText;
  lat: number;
  lng: number;
  populationNote: LocalizedText;
  seoIntro: LocalizedText;
  featured: boolean;
}

export interface Specialty {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  icon: string;
}

/** Hand-written seed rows: specialties are resolved from slugs at read time. */
export type SeedClinic = Omit<Clinic, "specialties">;

export interface ClinicHourRow {
  days: LocalizedText;
  time: string;
}

export interface Clinic {
  slug: string;
  googlePlaceId: string;
  name: string;
  nameAr: string;
  citySlug: string;
  neighborhood: LocalizedText;
  address: LocalizedText;
  phone?: string | null;
  phoneHref?: string | null;
  whatsapp?: string | null;
  website: string | null;
  rating: number;
  reviewCount: number;
  specialtySlugs: string[];
  /** Resolved from the junction table by the repository, for direct rendering. */
  specialties: Specialty[];
  verified: boolean;
  claimed: boolean;
  usesApp: boolean;
  description: LocalizedText;
  lat: number;
  lng: number;
  hours: ClinicHourRow[];
  lastSyncedAt: string;
}

export interface BlogPost {
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  content: LocalizedText;
  category: LocalizedText;
  readTime: number;
  date: string;
  relatedCitySlug: string | null;
  relatedSpecialtySlug: string | null;
}

/**
 * `status` is a `text` column in the contract, so the allowed values are a local
 * union rather than a generated enum (same reasoning as `Lead.type`).
 */
export type BlogPostStatus = "DRAFT" | "PUBLISHED";

export const blogPostStatuses: readonly BlogPostStatus[] = ["DRAFT", "PUBLISHED"];

export function isBlogPostStatus(value: string): value is BlogPostStatus {
  return (blogPostStatuses as readonly string[]).includes(value);
}

/**
 * A blog post row as the admin sees it.
 *
 * Extends the public {@link BlogPost} with the identity, workflow state and SEO
 * overrides that must never leak into page rendering. SEO fields are nullable
 * by design: a null value means "fall back to the post's own title/excerpt".
 */
export interface BlogPostRecord extends BlogPost {
  id: string;
  status: BlogPostStatus;
  coverImageUrl: string | null;
  metaTitle: LocalizedText;
  metaDescription: LocalizedText;
  keywords: LocalizedText;
  ogImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Everything the admin form can set. `publishedAt` is derived server-side from
 * the status transition rather than accepted from the browser.
 */
export type BlogPostInput = Omit<
  BlogPostRecord,
  "id" | "publishedAt" | "createdAt" | "updatedAt" | "date" | "status"
> & {
  status: BlogPostStatus;
};

/** A page-level SEO override, keyed by route and locale. */
export interface PageSeoRecord {
  id: string;
  routeKey: string;
  locale: Locale;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  metaRobots: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PageSeoInput = Omit<PageSeoRecord, "id" | "createdAt" | "updatedAt">;

export const leadTypes: readonly LeadType[] = [
  "app-demo",
  "website-quote",
  "clinic-claim",
  "contact",
];

export function isLeadType(value: string): value is LeadType {
  return (leadTypes as readonly string[]).includes(value);
}

export interface PricingPlanRecord {
  id: string;
  key: string;
  active: boolean;
  highlighted: boolean;
  sortOrder: number;
  leadType: LeadType;
  name: LocalizedText;
  price: LocalizedText;
  period: LocalizedText;
  cta: LocalizedText;
  badge: { fr: string | null; ar: string | null };
  features: { fr: string[]; ar: string[] };
  createdAt: string;
  updatedAt: string;
}

export type PricingPlanInput = Omit<PricingPlanRecord, "id" | "createdAt" | "updatedAt">;

export interface PricingPlanView {
  key: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  leadType: LeadType;
  badge?: string;
  highlighted: boolean;
  sortOrder: number;
}
