import { NextResponse, type NextRequest } from "next/server";
import { fetchClinicsForCity, syncAllCities, upsertClinicsToDatabase } from "@/lib/services/serpapi";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow sufficient time for batch calls

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const tokenParam = request.nextUrl.searchParams.get("token");

  // Authorization check (bypassed in development if no CRON_SECRET is configured)
  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    tokenParam === cronSecret;

  if (!isAuthorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: Invalid or missing CRON_SECRET" },
      { status: 401 }
    );
  }

  const serpApiKey = process.env.SERPAPI_API_KEY;
  if (!serpApiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing SERPAPI_API_KEY. Sign up at https://serpapi.com and configure the key in .env.local",
      },
      { status: 500 }
    );
  }

  const cityParam = request.nextUrl.searchParams.get("city");
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";

  try {
    if (cityParam) {
      // Sync a single city (consumes only 1 SerpApi search)
      const result = await fetchClinicsForCity(cityParam, serpApiKey);
      let dbSavedCount = 0;
      if (!dryRun && result.clinics.length > 0) {
        const saved = await upsertClinicsToDatabase(result.clinics);
        dbSavedCount = saved.count;
      }

      return NextResponse.json({
        ok: !result.error,
        mode: dryRun ? "dry-run" : "sync",
        searchesUsed: 1,
        dbSavedCount,
        result,
      });
    }

    // Sync all Moroccan cities (consumes 10 SerpApi searches)
    // 1.5s delay ensures compliance with SerpApi's 50/hour throughput limit
    const report = await syncAllCities({ apiKey: serpApiKey, delayMs: 1500 });
    let dbSavedCount = 0;
    if (!dryRun) {
      const allClinics = report.details.flatMap((d) => d.clinics);
      const saved = await upsertClinicsToDatabase(allClinics);
      dbSavedCount = saved.count;
    }

    return NextResponse.json({
      ok: true,
      mode: dryRun ? "dry-run" : "sync",
      dbSavedCount,
      report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: `Cron job failed: ${message}` },
      { status: 500 }
    );
  }
}
