import prisma from "@/lib/prisma";
import { or } from "@prisma/orm-postgres/orm-client";
import type { Clinic, ClinicHourRow, Specialty } from "@/lib/data/types";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { mapSpecialtyRow } from "@/lib/repositories/specialties";

/**
 * The database is the single source of truth for clinics. These queries have no
 * static-seed fallback: `lib/data/clinics.ts` exists only to bootstrap the
 * database via `prisma/seed.mjs`, so a query failure must surface rather than
 * silently serve 17 stale demo rows.
 */

/**
 * Shared clinic query: scalars plus the junction rows and their specialty.
 * `ResultType` derives the row shape from the query itself, so the mapper stays
 * in sync with the contract without hand-written field lists.
 */
const clinicsWithSpecialties = () =>
  prisma.orm.public.Clinic.include("specialties", (specialties) =>
    specialties.include("specialty"),
  );

type ClinicRow = ResultType<ReturnType<typeof clinicsWithSpecialties>>;

/**
 * Map a contract Clinic row to the application Clinic model.
 *
 * `hours` is a `jsonb` column and `lastSyncedAt` decodes to a `Temporal.Instant`
 * (the contract maps both to Postgres text/timestamptz codecs), so each is
 * narrowed here rather than trusted from the driver.
 */
function mapClinicRow(row: ClinicRow): Clinic {
  // Resolve the joined specialty once so consumers never re-query per clinic.
  const specialties: Specialty[] = [];
  for (const link of row.specialties) {
    if (!link.specialty) continue;
    const specialty = mapSpecialtyRow(link.specialty);
    if (!specialties.some((existing) => existing.slug === specialty.slug)) {
      specialties.push(specialty);
    }
  }

  return {
    slug: row.slug,
    googlePlaceId: row.googlePlaceId,
    name: row.name,
    nameAr: row.nameAr,
    citySlug: row.citySlug,
    neighborhood: {
      fr: row.neighborhoodFr,
      ar: row.neighborhoodAr,
    },
    address: {
      fr: row.addressFr,
      ar: row.addressAr,
    },
    phone: row.phone,
    phoneHref: row.phoneHref,
    whatsapp: row.whatsapp,
    website: row.website,
    rating: row.rating,
    reviewCount: row.reviewCount,
    specialtySlugs: specialties.map((specialty) => specialty.slug),
    specialties,
    verified: row.verified,
    claimed: row.claimed,
    usesApp: row.usesApp,
    description: {
      fr: row.descriptionFr,
      ar: row.descriptionAr,
    },
    lat: row.lat,
    lng: row.lng,
    hours: Array.isArray(row.hours) ? (row.hours as ClinicHourRow[]) : [],
    lastSyncedAt: String(row.lastSyncedAt ?? "").split("T")[0],
  };
}

/** Descending quality order, applied consistently across the directory. */
function byQuality(query: ReturnType<typeof clinicsWithSpecialties>) {
  return query
    .orderBy((clinic) => clinic.rating.desc())
    .orderBy((clinic) => clinic.reviewCount.desc());
}

export async function getClinicsByCityDb(citySlug: string, limit?: number): Promise<Clinic[]> {
  const query = byQuality(clinicsWithSpecialties().where({ citySlug }));
  const records = await (limit === undefined ? query.limit(5000) : query.limit(limit)).all();
  return records.map(mapClinicRow);
}

export async function getClinicDb(citySlug: string, clinicSlug: string): Promise<Clinic | undefined> {
  const record = await clinicsWithSpecialties()
    .where({ citySlug, slug: clinicSlug })
    .first();

  return record ? mapClinicRow(record) : undefined;
}

export async function getFeaturedClinicsDb(limit = 6): Promise<Clinic[]> {
  const records = await byQuality(clinicsWithSpecialties().where({ verified: true }))
    .limit(limit)
    .all();
  return records.map(mapClinicRow);
}

/**
 * Related clinics for a treatment or blog page: prefer clinics carrying the
 * specialty, then fall back to top-rated clinics so the section is never empty.
 */
/**
 * Related clinics for a treatment or blog page: prefer clinics carrying the
 * specialty, then fall back to top-rated clinics so the section is never empty.
 */
export async function getClinicsBySpecialtyDb(
  specialtySlug: string,
  limit = 3,
): Promise<Clinic[]> {
  // The predicate filters the junction's `specialtyId` rather than reaching
  // through to `specialty.slug`: a to-one relation is not addressable inside a
  // `.some()` predicate (it surfaces as `Orderable`, with no `.eq`).
  const specialty = await prisma.orm.public.Specialty.where({ slug: specialtySlug }).first();
  if (!specialty) return [];

  const matches = await byQuality(
    clinicsWithSpecialties().where((clinic) =>
      clinic.specialties.some((link) => link.specialtyId.eq(specialty.id)),
    ),
  )
    .limit(limit)
    .all();

  const clinics = matches.map(mapClinicRow);
  if (clinics.length >= limit) return clinics;

  // Backfill with top-rated clinics so a sparse specialty still renders a grid.
  const seen = new Set(clinics.map((clinic) => clinic.slug));
  const filler = await byQuality(clinicsWithSpecialties())
    .limit(limit * 2)
    .all();
  for (const row of filler) {
    if (clinics.length >= limit) break;
    if (seen.has(row.slug)) continue;
    seen.add(row.slug);
    clinics.push(mapClinicRow(row));
  }
  return clinics;
}

/**
 * Clinic lookup for the "claim your profile" flow. Searches the display names,
 * the city slug and the neighbourhood in both locales, which is what someone
 * types when they cannot remember the exact spelling of a practice.
 */
export async function searchClinicsDb(query: string, limit = 6): Promise<Clinic[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // `ilike` rather than the shorthand `{ contains }` filter, which resolves to
  // equality and therefore matched nothing.
  const pattern = `%${trimmed}%`;
  const records = await clinicsWithSpecialties()
    .where((clinic) =>
      or(
        clinic.name.ilike(pattern),
        clinic.nameAr.ilike(pattern),
        clinic.citySlug.ilike(pattern),
        clinic.neighborhoodFr.ilike(pattern),
        clinic.neighborhoodAr.ilike(pattern),
      ),
    )
    .limit(limit)
    .all();

  return records.map(mapClinicRow);
}

/**
 * `(citySlug, clinicSlug)` pairs for sitemap generation, as a two-tuple list
 * rather than full rows — the sitemap needs URLs, not clinic payloads.
 */
export async function getClinicSlugsDb(): Promise<{ citySlug: string; slug: string }[]> {
  const rows = await prisma.orm.public.Clinic.all();
  return rows.map((row) => ({ citySlug: row.citySlug, slug: row.slug }));
}

/**
 * A bounded `(citySlug, clinicSlug)` sample per city for `generateStaticParams`.
 * The full 827-row set is rendered on demand via `dynamicParams`, so prebuilding
 * every profile would only slow the build down.
 */
export async function getClinicSitemapParamsDb(
  perCityLimit = 10,
): Promise<{ citySlug: string; slug: string }[]> {
  const cities = await prisma.orm.public.City.all();
  const perCity = await Promise.all(
    cities.map(async (city) => {
      const rows = await byQuality(clinicsWithSpecialties().where({ citySlug: city.slug }))
        .limit(perCityLimit)
        .all();
      return rows.map((row) => ({ citySlug: city.slug, slug: row.slug }));
    }),
  );
  return perCity.flat();
}