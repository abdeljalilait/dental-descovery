import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { clinicsToCsv } from "@/lib/clinic-csv";
import { listAllAdminClinicsDb } from "@/lib/repositories/admin-clinics";

/**
 * CSV export of the clinic table.
 *
 * Shares `filteredClinics` with the admin page, so exporting the active filters
 * is the same data the operator is looking at, and the file produced here is the
 * exact format `importClinicsAction` accepts.
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? undefined;
  const city = url.searchParams.get("city") ?? undefined;
  const flag = url.searchParams.get("flag") ?? undefined;

  const rows = await listAllAdminClinicsDb({ query, city, flag });
  const csv = clinicsToCsv(rows);

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="dentora-clinics-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}