import prisma from "@/lib/prisma";
import type { Specialty } from "@/lib/data/types";

type SpecialtyRow = {
  slug: string;
  nameFr: string;
  nameAr: string;
  descriptionFr: string;
  descriptionAr: string;
  icon: string;
};

/**
 * Map a contract Specialty row to the application Specialty model, collapsing
 * the `*Fr`/`*Ar` column pairs into the localized records the UI expects.
 */
export function mapSpecialtyRow(row: SpecialtyRow): Specialty {
  return {
    slug: row.slug,
    name: { fr: row.nameFr, ar: row.nameAr },
    description: { fr: row.descriptionFr, ar: row.descriptionAr },
    icon: row.icon,
  };
}

/** Every specialty, in the contract's natural order. */
export async function getSpecialtiesDb(): Promise<Specialty[]> {
  const rows = await prisma.orm.public.Specialty.all();
  return rows.map(mapSpecialtyRow);
}

/** A single specialty, or `undefined` when the slug is unknown. */
export async function getSpecialtyDb(slug: string): Promise<Specialty | undefined> {
  const row = await prisma.orm.public.Specialty.where({ slug }).first();
  return row ? mapSpecialtyRow(row) : undefined;
}

export async function getSpecialtySlugsDb(): Promise<string[]> {
  const rows = await prisma.orm.public.Specialty.all();
  return rows.map((row) => row.slug);
}

/**
 * Slugs of the cities that actually have at least one clinic offering this
 * specialty. Drives the "cities with <treatment>" list on treatment pages.
 */
export async function getCitiesWithSpecialtyDb(specialtySlug: string): Promise<string[]> {
  const specialty = await prisma.orm.public.Specialty.where({ slug: specialtySlug }).first();
  if (!specialty) return [];

  const clinics = await prisma.orm.public.Clinic.where((clinic) =>
    clinic.specialties.some((link) => link.specialtyId.eq(specialty.id)),
  ).all();

  return [...new Set(clinics.map((clinic) => clinic.citySlug))];
}

/**
 * slug -> clinic count, from a single grouped pass over the junction table.
 * Used to size the specialty grid and the treatment pages.
 */
export async function getClinicCountBySpecialtyDb(): Promise<Record<string, number>> {
  const [links, specialties] = await Promise.all([
    prisma.orm.public.ClinicSpecialty.groupBy("specialtyId").aggregate((aggregate) => ({
      count: aggregate.count(),
    })),
    prisma.orm.public.Specialty.all(),
  ]);

  const byId = new Map(links.map((link) => [link.specialtyId, link.count]));
  const counts: Record<string, number> = {};
  for (const specialty of specialties) {
    counts[specialty.slug] = byId.get(specialty.id) ?? 0;
  }
  return counts;
}