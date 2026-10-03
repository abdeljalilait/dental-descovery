import { NextResponse } from "next/server";
import { searchClinicsDb } from "@/lib/repositories/clinics";

export const revalidate = 0;

/**
 * Clinic lookup for the "claim your profile" flow.
 *
 * Searches the database rather than the seed array, so the 827 synced clinics
 * are claimable and not just the handful of hand-written demo rows.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ clinics: [] });
  }

  try {
    const clinics = await searchClinicsDb(query, 6);

    // Only the fields the lookup renders, to keep the payload small.
    return NextResponse.json({
      clinics: clinics.map((clinic) => ({
        slug: clinic.slug,
        citySlug: clinic.citySlug,
        name: clinic.name,
        nameAr: clinic.nameAr,
        address: clinic.address,
        claimed: clinic.claimed,
      })),
    });
  } catch (error) {
    console.error("[API] Clinic search failed:", error);
    return NextResponse.json({ clinics: [], error: "search_failed" }, { status: 500 });
  }
}