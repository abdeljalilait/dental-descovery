import prisma from "@/lib/prisma";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { toInstant, toJson } from "@/src/prisma/codecs";
import type { ClinicHourRow } from "@/lib/data/types";

/**
 * Admin-only clinic table browsing and CSV round-tripping.
 *
 * The public directory has its own curated queries in `lib/repositories/clinics.ts`;
 * this one exists for operators who need every row, every field, and the ability
 * to edit them in bulk. Import/export share `lib/clinic-csv.ts` so a file exported
 * from `/admin/clinics` imports back without hand-editing.
 */

const adminClinics = () =>
  prisma.orm.public.Clinic.include("specialties", (specialties) =>
    specialties.include("specialty"),
  );

export type AdminClinicRow = ResultType<ReturnType<typeof adminClinics>>;

export interface AdminClinicFilters {
  /** Free-text match on name, slug, phone and WhatsApp. */
  query?: string;
  city?: string;
  /** `verified`, `claimed`, `usesApp`, or empty for all. */
  flag?: string;
  page?: number;
  perPage?: number;
}

export const ADMIN_CLINIC_PER_PAGE = 25;

/**
 * The admin clinic query with every active filter applied.
 *
 * Filtering happens inside a single `where` callback because that is where the
 * model accessors are typed: clauses collected in this scope keep their types,
 * and `and` folds the optional ones together. Every caller derives from this one
 * function, so the table, the count and the export can never drift apart.
 */
function filteredClinics(filters: AdminClinicFilters) {
  return adminClinics().where((clinic) => {
    const clauses = [];

    const query = filters.query?.trim();
    if (query) {
      // `ilike` rather than the `{ contains }` shorthand, which the fluent API
      // resolves to equality (and therefore matched nothing).
      const pattern = `%${query}%`;
      clauses.push(
        or(
          clinic.name.ilike(pattern),
          clinic.nameAr.ilike(pattern),
          clinic.slug.ilike(pattern),
          clinic.phone.ilike(pattern),
          clinic.whatsapp.ilike(pattern),
        ),
      );
    }

    if (filters.city) clauses.push(clinic.citySlug.eq(filters.city));

    switch (filters.flag) {
      case "verified":
        clauses.push(clinic.verified.eq(true));
        break;
      case "claimed":
        clauses.push(clinic.claimed.eq(true));
        break;
      case "usesApp":
        clauses.push(clinic.usesApp.eq(true));
        break;
      case "noWhatsapp":
        clauses.push(clinic.whatsapp.isNull());
        break;
      default:
        break;
    }

    return and(...clauses);
  });
}

export interface AdminClinicPage {
  rows: AdminClinicRow[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

/** One page of clinics for the admin table, with a total for the pager. */
export async function listAdminClinicsDb(filters: AdminClinicFilters = {}): Promise<AdminClinicPage> {
  const perPage = filters.perPage ?? ADMIN_CLINIC_PER_PAGE;
  const page = Math.max(1, filters.page ?? 1);

  const rows = await filteredClinics(filters)
    .orderBy((clinic) => clinic.name.asc())
    .limit(perPage)
    .offset((page - 1) * perPage)
    .all();

  const total = await filteredClinics(filters).aggregate((aggregate) => ({
    count: aggregate.count(),
  }));

  return {
    rows,
    total: total.count,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total.count / perPage)),
  };
}

export interface AdminCityFacet {
  citySlug: string;
  name: string;
  count: number;
}

/** Clinic counts per city, for the filter dropdown. */
export async function listAdminCityFacetsDb(): Promise<AdminCityFacet[]> {
  const cities = await prisma.orm.public.City.all();
  const clinics = await prisma.orm.public.Clinic.all();

  const counts = new Map<string, number>();
  for (const clinic of clinics) {
    counts.set(clinic.citySlug, (counts.get(clinic.citySlug) ?? 0) + 1);
  }

  return cities
    .map((city) => ({ citySlug: city.slug, name: city.name, count: counts.get(city.slug) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/** Every clinic for a CSV export; the same projection the table uses. */
export async function listAllAdminClinicsDb(filters: AdminClinicFilters = {}): Promise<AdminClinicRow[]> {
  return filteredClinics(filters)
    .orderBy((clinic) => clinic.name.asc())
    .all();
}

export interface ClinicImportRow {
  slug: string;
  googlePlaceId: string;
  name: string;
  nameAr: string;
  citySlug: string;
  neighborhoodFr: string;
  neighborhoodAr: string;
  addressFr: string;
  addressAr: string;
  phone?: string;
  phoneHref?: string;
  whatsapp?: string;
  website?: string;
  email?: string;
  emailSource?: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  claimed: boolean;
  usesApp: boolean;
  descriptionFr: string;
  descriptionAr: string;
  lat: number;
  lng: number;
  hours: ClinicHourRow[];
  lastSyncedAt?: string;
  /** Slugs joined by `|` in the CSV; empty leaves the existing set untouched. */
  specialtySlugs?: string[];
}

export interface ClinicImportReport {
  created: number;
  updated: number;
  skipped: number;
  errors: { line: number; slug: string; reason: string }[];
}

/**
 * Upsert imported rows.
 *
 * `slug` is the stable key for an operator: it is the field a human reads in the
 * spreadsheet, and it is unique in the contract, so a re-import updates the same
 * clinic instead of duplicating it. Rows missing required columns are reported
 * per line rather than aborting the whole file.
 */
export async function importClinicsDb(rows: ClinicImportRow[]): Promise<ClinicImportReport> {
  const report: ClinicImportReport = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    const line = index + 2; // +1 for the header, +1 for 1-based lines.

    if (!row.slug || !row.name || !row.citySlug) {
      report.errors.push({ line, slug: row.slug ?? "", reason: "slug, name and city are required" });
      continue;
    }

    const exists = await prisma.orm.public.Clinic.where({ slug: row.slug }).first();
    if (!exists) report.created++;
    else report.updated++;

    const columns = {
      googlePlaceId: row.googlePlaceId || `manual:${row.slug}`,
      name: row.name,
      nameAr: row.nameAr || row.name,
      citySlug: row.citySlug,
      neighborhoodFr: row.neighborhoodFr || "",
      neighborhoodAr: row.neighborhoodAr || "",
      addressFr: row.addressFr || "",
      addressAr: row.addressAr || "",
      phone: row.phone || null,
      phoneHref: row.phoneHref || null,
      whatsapp: row.whatsapp || null,
      website: row.website || null,
      email: row.email || null,
      emailSource: row.emailSource || null,
      rating: row.rating,
      reviewCount: row.reviewCount,
      verified: row.verified,
      claimed: row.claimed,
      usesApp: row.usesApp,
      descriptionFr: row.descriptionFr || "",
      descriptionAr: row.descriptionAr || "",
      lat: row.lat,
      lng: row.lng,
      hours: toJson(row.hours),
      lastSyncedAt: toInstant(row.lastSyncedAt ?? new Date()),
    };

    const upserted = await prisma.orm.public.Clinic.upsert({
      conflictOn: { slug: row.slug },
      create: { slug: row.slug, ...columns },
      update: columns,
    });

    // Specialties live in a junction table, so they are applied after the upsert.
    // An empty cell means "leave as is" rather than "no specialties": dropping a
    // clinic's taxonomy because a spreadsheet column was blank would be worse
    // than ignoring it.
    if (row.specialtySlugs?.length) {
      for (const specialtySlug of row.specialtySlugs) {
        const specialty = await prisma.orm.public.Specialty.where({ slug: specialtySlug }).first();
        if (!specialty) continue;

        await prisma.orm.public.ClinicSpecialty.upsert({
          conflictOn: { clinicId: upserted.id, specialtyId: specialty.id },
          update: {},
          create: { clinicId: upserted.id, specialtyId: specialty.id },
        });
      }
    }
  }

  return report;
}

/** Flips a clinic between app customer and prospect, without a full form. */
export async function setClinicUsesAppDb(slug: string, usesApp: boolean): Promise<void> {
  await prisma.orm.public.Clinic.where({ slug }).update({ usesApp });
}

export async function setClinicVerifiedDb(slug: string, verified: boolean): Promise<void> {
  await prisma.orm.public.Clinic.where({ slug }).update({ verified });
}

export async function getClinicBySlugDb(slug: string): Promise<AdminClinicRow | null> {
  return adminClinics().where({ slug }).first();
}