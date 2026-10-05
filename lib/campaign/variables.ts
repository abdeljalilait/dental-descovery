import { siteConfig } from "@/lib/site.config";
import { cities } from "@/lib/data/cities";

/**
 * Meta WhatsApp Cloud API parameter naming rule:
 * Parameter names must contain ONLY lowercase letters, numbers, and underscores (`^[a-z0-9_]+$`).
 */
export const VARIABLE_NAME_REGEX = /^[a-z0-9_]+$/;

export function isValidVariableName(name: string): boolean {
  return VARIABLE_NAME_REGEX.test(name);
}

/**
 * Normalizes any variable name to snake_case lowercase alphanumeric identifier.
 * e.g. "clinicName" -> "clinic_name", "cityName" -> "city_name", "profileUrl" -> "profile_url"
 */
export function normalizeVariableName(name: string): string {
  const trimmed = name.trim();
  // If already valid snake_case or numeric index
  if (VARIABLE_NAME_REGEX.test(trimmed)) return trimmed;

  // Convert camelCase or kebab-case to snake_case
  return trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

export interface ClinicContext {
  id?: string;
  name: string;
  citySlug: string;
  slug: string;
  phone?: string | null;
  whatsapp?: string | null;
}

/**
 * Resolves standard template variables for a clinic.
 * Returns both snake_case names and numeric index fallbacks (1, 2, 3).
 */
export function resolveClinicVariables(clinic: ClinicContext): Record<string, string> {
  const cityName = cities.find((c) => c.slug === clinic.citySlug)?.name ?? clinic.citySlug;
  const profileUrl = `${siteConfig.url}/fr/dentistes/${clinic.citySlug}/${clinic.slug}`;
  const phone = clinic.whatsapp || clinic.phone || "";

  return {
    clinic_name: clinic.name,
    city_name: cityName,
    profile_url: profileUrl,
    clinic_slug: clinic.slug,
    phone_number: phone,

    // Aliases for camelCase legacy compatibility
    clinicName: clinic.name,
    cityName,
    profileUrl,

    // Positional index aliases (1 = clinic_name, 2 = city_name, 3 = profile_url)
    "1": clinic.name,
    "2": cityName,
    "3": profileUrl,
  };
}

/**
 * Renders a template body string by replacing {{var}} or {{1}} with resolved values.
 */
export function renderTemplateBody(
  body: string,
  resolved: Record<string, string>,
  varOrder?: string[]
): string {
  // First handle {{var_name}}
  const rendered = body.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key: string) => {
    // Exact match or normalized match
    if (resolved[key] !== undefined) return resolved[key];
    const norm = normalizeVariableName(key);
    if (resolved[norm] !== undefined) return resolved[norm];

    // If numeric index {{1}}, {{2}}, etc. and varOrder provided
    if (/^\d+$/.test(key) && varOrder && varOrder.length > 0) {
      const idx = parseInt(key, 10) - 1;
      const mappedKey = varOrder[idx];
      if (mappedKey && resolved[mappedKey] !== undefined) {
        return resolved[mappedKey];
      }
    }

    return match;
  });

  return rendered;
}

/**
 * Builds Meta-compliant parameters array for the WhatsApp Cloud API.
 * Ensures parameter_name (when used) matches `^[a-z0-9_]+$`.
 */
export function buildMetaParameters(
  varKeys: string[],
  resolved: Record<string, string>
): { type: "text"; text: string; parameter_name?: string }[] {
  return varKeys.map((key) => {
    const normKey = normalizeVariableName(key);
    const value = resolved[normKey] ?? resolved[key] ?? "";
    const isNamed = !/^\d+$/.test(normKey);

    return {
      type: "text" as const,
      text: value,
      // Only include parameter_name if it is a valid named variable
      ...(isNamed && isValidVariableName(normKey) ? { parameter_name: normKey } : {}),
    };
  });
}
