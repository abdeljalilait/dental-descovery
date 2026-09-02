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
  phone: string;
  phoneHref: string;
  whatsapp: string;
  website: string | null;
  rating: number;
  reviewCount: number;
  specialtySlugs: string[];
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
