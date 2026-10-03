import prisma from "@/lib/prisma";

export interface DirectoryStats {
  clinicCount: number;
  cityCount: number;
  specialtyCount: number;
  averageRating: number;
  reviewCount: number;
}

/**
 * Headline figures for the hero and stats bar.
 *
 * `avg(rating)` ignores rows with no rating (SQL `AVG` over `NULL`s), so the
 * result is the mean across clinics that actually have reviews rather than a
 * value diluted by unrated listings.
 */
export async function getDirectoryStatsDb(): Promise<DirectoryStats> {
  const [clinicTotals, cityCount, specialtyCount] = await Promise.all([
    prisma.orm.public.Clinic.aggregate((aggregate) => ({
      clinicCount: aggregate.count(),
      averageRating: aggregate.avg("rating"),
      reviewCount: aggregate.sum("reviewCount"),
    })),
    prisma.orm.public.City.aggregate((aggregate) => ({ cityCount: aggregate.count() })),
    prisma.orm.public.Specialty.aggregate((aggregate) => ({ specialtyCount: aggregate.count() })),
  ]);

  return {
    clinicCount: clinicTotals.clinicCount,
    cityCount: cityCount.cityCount,
    specialtyCount: specialtyCount.specialtyCount,
    averageRating: Math.round((clinicTotals.averageRating ?? 0) * 10) / 10,
    reviewCount: clinicTotals.reviewCount ?? 0,
  };
}

/**
 * Clinic count per city slug, from one grouped pass instead of N per-city
 * queries. Cities with no clinics are absent from the result.
 */
export async function getClinicCountByCityDb(): Promise<Record<string, number>> {
  const grouped = await prisma.orm.public.Clinic.groupBy("citySlug").aggregate((aggregate) => ({
    count: aggregate.count(),
  }));

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    counts[row.citySlug] = row.count;
  }
  return counts;
}