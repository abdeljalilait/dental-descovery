import type { ClinicHourRow } from "@/lib/data/types";
import type { AdminClinicRow, ClinicImportRow } from "@/lib/repositories/admin-clinics";

/**
 * CSV round-trip for the clinic table.
 *
 * Export and import share this module, so a file downloaded from
 * `/admin/clinics` imports back without editing: the column order, the header
 * names and the value encodings are defined exactly once, here.
 *
 * Two rules keep the format lossless and spreadsheet-safe:
 *  - every field is quoted and quotes are doubled, so commas, quotes and newlines
 *    inside an address or description survive;
 *  - `hours` is stored as JSON in one column, which keeps nested day arrays in a
 *    single cell instead of spilling into unnamed columns.
 */

export const CLINIC_CSV_COLUMNS = [
  "slug",
  "googlePlaceId",
  "name",
  "nameAr",
  "citySlug",
  "neighborhoodFr",
  "neighborhoodAr",
  "addressFr",
  "addressAr",
  "phone",
  "phoneHref",
  "whatsapp",
  "website",
  "email",
  "emailSource",
  "rating",
  "reviewCount",
  "verified",
  "claimed",
  "usesApp",
  "descriptionFr",
  "descriptionAr",
  "lat",
  "lng",
  "hours",
  "lastSyncedAt",
  "specialtySlugs",
] as const;

export type ClinicCsvColumn = (typeof CLINIC_CSV_COLUMNS)[number];

/** Prefix so an operator recognises the file even months later. */
export const CLINIC_CSV_HEADER_COMMENT = "# Dentora clinics export";

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function boolCell(value: boolean | null | undefined): string {
  return value ? "true" : "false";
}

function hoursCell(hours: unknown): string {
  // A malformed `hours` value must not break the whole export.
  try {
    return JSON.stringify(Array.isArray(hours) ? hours : []);
  } catch {
    return "[]";
  }
}

/** Render the clinic rows as CSV text, header comment first. */
export function clinicsToCsv(rows: AdminClinicRow[]): string {
  const lines = [CLINIC_CSV_HEADER_COMMENT, CLINIC_CSV_COLUMNS.join(",")];

  for (const row of rows) {
    const specialtySlugs = row.specialties
      .map((link) => link.specialty?.slug)
      .filter((slug): slug is string => Boolean(slug));

    const cells: Record<ClinicCsvColumn, string> = {
      slug: row.slug,
      googlePlaceId: row.googlePlaceId ?? "",
      name: row.name,
      nameAr: row.nameAr,
      citySlug: row.citySlug,
      neighborhoodFr: row.neighborhoodFr,
      neighborhoodAr: row.neighborhoodAr,
      addressFr: row.addressFr,
      addressAr: row.addressAr,
      phone: row.phone ?? "",
      phoneHref: row.phoneHref ?? "",
      whatsapp: row.whatsapp ?? "",
      website: row.website ?? "",
      email: row.email ?? "",
      emailSource: row.emailSource ?? "",
      rating: String(row.rating),
      reviewCount: String(row.reviewCount),
      verified: boolCell(row.verified),
      claimed: boolCell(row.claimed),
      usesApp: boolCell(row.usesApp),
      descriptionFr: row.descriptionFr,
      descriptionAr: row.descriptionAr,
      lat: String(row.lat),
      lng: String(row.lng),
      hours: hoursCell(row.hours),
      lastSyncedAt: String(row.lastSyncedAt ?? ""),
      specialtySlugs: specialtySlugs.join("|"),
    };

    lines.push(CLINIC_CSV_COLUMNS.map((column) => csvCell(cells[column])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

export interface ParsedClinicCsv {
  rows: Record<ClinicCsvColumn, string>[];
  /** Rows that could not be parsed at all (wrong column count, bad quoting). */
  errors: { line: number; reason: string }[];
}

/** Split one CSV line, honouring quoted fields and doubled quotes. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside a quoted cell is a literal quote.
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

/**
 * Parse CSV text into rows keyed by column name.
 *
 * Header names are matched case- and space-insensitively so a file touched in a
 * spreadsheet still imports, and unknown columns are ignored.
 */
export function parseClinicsCsv(text: string): ParsedClinicCsv {
  const errors: ParsedClinicCsv["errors"] = [];
  const rows: ParsedClinicCsv["rows"] = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0 && !line.trimStart().startsWith("#"));

  if (lines.length === 0) return { rows, errors };

  const header = splitCsvLine(lines[0]!).map((cell) =>
    cell.trim().toLowerCase().replace(/[\s_-]+/g, ""),
  );

  const columnIndexes = CLINIC_CSV_COLUMNS.map((column) => {
    const normalized = column.toLowerCase().replace(/[\s_-]+/g, "");
    return header.indexOf(normalized);
  });

  if (columnIndexes.every((index) => index === -1)) {
    errors.push({ line: 1, reason: "No recognised clinic columns in the header row" });
    return { rows, errors };
  }

  for (const [index, line] of lines.slice(1).entries()) {
    const lineNumber = index + 2;
    const cells = splitCsvLine(line);

    if (cells.length !== header.length) {
      errors.push({
        line: lineNumber,
        reason: `Expected ${header.length} columns, found ${cells.length}`,
      });
      continue;
    }

    const row = {} as Record<ClinicCsvColumn, string>;
    columnIndexes.forEach((columnIndex, position) => {
      row[CLINIC_CSV_COLUMNS[position]!] = columnIndex === -1 ? "" : (cells[columnIndex] ?? "");
    });
    rows.push(row);
  }

  return { rows, errors };
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBool(value: string): boolean {
  return ["true", "1", "yes", "oui", "vrai"].includes(value.trim().toLowerCase());
}

function parseHours(value: string): ClinicHourRow[] {
  if (!value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ClinicHourRow[]) : [];
  } catch {
    return [];
  }
}

/**
 * Turn parsed CSV rows into import rows.
 *
 * Numeric, boolean and JSON columns fall back to safe defaults rather than
 * rejecting the row: an operator fixing one cell in a spreadsheet should not lose
 * the whole file. Identity columns (slug, name, city) are the only ones the
 * importer can reject, and it does so while reporting the line number.
 */
export function toImportRows(rows: ParsedClinicCsv["rows"]): ClinicImportRow[] {
  return rows.map((row) => ({
    slug: row.slug.trim(),
    googlePlaceId: row.googlePlaceId.trim(),
    name: row.name.trim(),
    nameAr: row.nameAr.trim() || row.name.trim(),
    citySlug: row.citySlug.trim(),
    neighborhoodFr: row.neighborhoodFr,
    neighborhoodAr: row.neighborhoodAr,
    addressFr: row.addressFr,
    addressAr: row.addressAr,
    phone: row.phone.trim() || undefined,
    phoneHref: row.phoneHref.trim() || undefined,
    whatsapp: row.whatsapp.trim() || undefined,
    website: row.website.trim() || undefined,
    email: row.email.trim() || undefined,
    emailSource: row.emailSource.trim() || undefined,
    rating: parseNumber(row.rating, 5),
    reviewCount: parseNumber(row.reviewCount, 0),
    verified: parseBool(row.verified),
    claimed: parseBool(row.claimed),
    usesApp: parseBool(row.usesApp),
    descriptionFr: row.descriptionFr,
    descriptionAr: row.descriptionAr || row.descriptionFr,
    lat: parseNumber(row.lat, 0),
    lng: parseNumber(row.lng, 0),
    hours: parseHours(row.hours),
    lastSyncedAt: row.lastSyncedAt.trim() || undefined,
    specialtySlugs: row.specialtySlugs
      .split("|")
      .map((slug) => slug.trim())
      .filter(Boolean),
  }));
}
