import { getWhatsAppTemplatesDb, getWhatsAppTemplateByIdDb, type WhatsAppTemplateRow } from "@/lib/repositories/kapso";
import { resolveClinicVariables, type ClinicContext } from "./variables";

export interface TemplateVars {
  clinic_name: string;
  city_name: string;
  profile_url: string;
  clinic_slug?: string;
  phone_number?: string;
  // Legacy aliases for backward compatibility
  clinicName?: string;
  cityName?: string;
  profileUrl?: string;
}

export interface CampaignTemplate {
  id: string;
  key: string;
  channel: "WHATSAPP";
  locale: "fr" | "ar" | string;
  name: string;
  body: string;
  variables: string[];
  status: string;
  accountId: string;
}

export function toCampaignTemplate(row: WhatsAppTemplateRow): CampaignTemplate {
  return {
    id: row.id,
    key: row.name,
    channel: "WHATSAPP",
    locale: row.language,
    name: `${row.name} (${row.language.toUpperCase()})`,
    body: row.bodyText,
    variables: row.variables,
    status: row.status,
    accountId: row.accountId,
  };
}

/**
 * Loads all active, approved templates from PostgreSQL (synced from Kapso).
 * Replaces old hardcoded arrays.
 */
export async function getCampaignTemplatesDb(accountId?: string): Promise<CampaignTemplate[]> {
  const rows = await getWhatsAppTemplatesDb({
    accountId,
    status: "APPROVED",
  });
  return rows.map(toCampaignTemplate);
}

/**
 * Finds a template by its database ID or Meta template name.
 */
export async function getTemplateByKey(keyOrId: string): Promise<CampaignTemplate | undefined> {
  const byId = await getWhatsAppTemplateByIdDb(keyOrId);
  if (byId) return toCampaignTemplate(byId);

  const all = await getWhatsAppTemplatesDb();
  const byName = all.find((t) => t.name === keyOrId || t.id === keyOrId);
  return byName ? toCampaignTemplate(byName) : undefined;
}

export { resolveClinicVariables, type ClinicContext };
