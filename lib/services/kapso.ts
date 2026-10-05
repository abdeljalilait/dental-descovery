import { WhatsAppClient } from "@kapso/whatsapp-cloud-api";
import { toWhatsApp } from "@/lib/utils/phone";
import {
  getKapsoAccountByIdDb,
  getDefaultKapsoAccountDb,
  updateKapsoAccountDb,
  upsertWhatsAppTemplateDb,
  getWhatsAppTemplatesDb,
  type KapsoAccountRow,
  type WhatsAppTemplateRow,
  createKapsoAccountDb,
} from "@/lib/repositories/kapso";
import {
  buildMetaParameters,
  normalizeVariableName,
  isValidVariableName,
  renderTemplateBody,
} from "@/lib/campaign/variables";

export interface SendTemplateResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface TestConnectionResult {
  ok: boolean;
  status: "ACTIVE" | "ERROR";
  message: string;
  details?: Record<string, unknown>;
}

export interface SyncTemplatesResult {
  ok: boolean;
  synced: number;
  message: string;
  templates: WhatsAppTemplateRow[];
}

export function normalizeKapsoBaseUrl(url?: string | null): string {
  if (!url || url.includes("app.kapso.ai")) {
    return "https://api.kapso.ai/meta/whatsapp";
  }
  return url.trim().replace(/\/+$/, "");
}

/**
 * Resolves the KapsoAccount to use, falling back to environment variables.
 * If DB has no accounts but env vars are set, bootstraps an initial account in DB.
 */
export async function resolveKapsoAccount(accountId?: string): Promise<KapsoAccountRow | null> {
  if (accountId) {
    const acc = await getKapsoAccountByIdDb(accountId);
    if (acc) return acc;
  }

  const defaultAcc = await getDefaultKapsoAccountDb();
  if (defaultAcc) return defaultAcc;

  // Fallback: check environment variables and bootstrap into DB
  const envKey = process.env.KAPSO_API_KEY;
  const envPhoneId = process.env.KAPSO_PHONE_NUMBER_ID;
  const envBaseUrl = normalizeKapsoBaseUrl(process.env.KAPSO_BASE_URL);
  const envWabaId = process.env.KAPSO_BUSINESS_ACCOUNT_ID;

  if (envKey && envPhoneId) {
    const newId = await createKapsoAccountDb({
      name: "Compte Principal (Env)",
      phoneNumberId: envPhoneId,
      businessAccountId: envWabaId || null,
      apiKey: envKey,
      baseUrl: envBaseUrl,
      isDefault: true,
    });
    return getKapsoAccountByIdDb(newId);
  }

  return null;
}

/**
 * Tests connection to Kapso by querying the phone number information via WhatsAppClient.
 */
export async function testKapsoAccountConnection(accountId: string): Promise<TestConnectionResult> {
  const account = await getKapsoAccountByIdDb(accountId);
  if (!account) {
    return { ok: false, status: "ERROR", message: "Account not found" };
  }

  const startTime = Date.now();
  const baseUrl = normalizeKapsoBaseUrl(account.baseUrl);

  try {
    const client = new WhatsAppClient({
      baseUrl,
      kapsoApiKey: account.apiKey,
    });

    const body = (await client.request("GET", account.phoneNumberId.trim(), {
      responseType: "json",
    })) as Record<string, unknown>;

    const latencyMs = Date.now() - startTime;

    const details = {
      ok: true,
      latencyMs,
      displayPhoneNumber: (body.display_phone_number || body.displayPhoneNumber || body.phone_number) as string | undefined,
      verifiedName: (body.verified_name || body.verifiedName || body.name) as string | undefined,
      qualityRating: (body.quality_rating || body.qualityRating) as string | undefined,
      codeVerificationStatus: (body.code_verification_status || body.codeVerificationStatus) as string | undefined,
    };

    await updateKapsoAccountDb(account.id, {
      baseUrl,
      status: "ACTIVE",
      lastTestedAt: new Date(),
      testResult: details,
    });

    const displayName = details.verifiedName ? `${details.verifiedName} (${details.displayPhoneNumber || account.phoneNumberId})` : (details.displayPhoneNumber || account.phoneNumberId);

    return {
      ok: true,
      status: "ACTIVE",
      message: `Connexion réussie (${latencyMs}ms) — ${displayName}`,
      details,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);
    await updateKapsoAccountDb(account.id, {
      status: "ERROR",
      lastTestedAt: new Date(),
      testResult: { ok: false, error: errMsg, latencyMs },
    });

    return { ok: false, status: "ERROR", message: errMsg, details: { latencyMs } };
  }
}

interface RawKapsoTemplateComponent {
  type: string;
  text?: string;
  format?: string;
  example?: { body_text?: string[][] };
  buttons?: unknown[];
}

interface RawKapsoTemplateItem {
  id?: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  components?: RawKapsoTemplateComponent[];
}

/**
 * Syncs approved message templates from Kapso into PostgreSQL.
 */
export async function syncKapsoTemplates(accountId: string): Promise<SyncTemplatesResult> {
  const account = await getKapsoAccountByIdDb(accountId);
  if (!account) {
    return { ok: false, synced: 0, message: "Account not found", templates: [] };
  }

  const baseUrl = normalizeKapsoBaseUrl(account.baseUrl);
  const client = new WhatsAppClient({
    baseUrl,
    kapsoApiKey: account.apiKey,
  });

  const targetId = account.businessAccountId?.trim() || account.phoneNumberId.trim();

  try {
    const data = (await client.request("GET", `${targetId}/message_templates`, {
      query: { limit: 100 },
      responseType: "json",
    })) as { data?: RawKapsoTemplateItem[] };

    const rawTemplates = data.data ?? [];

    let syncedCount = 0;

    for (const raw of rawTemplates) {
      if (!raw.name || !raw.language) continue;

      let bodyText = "";
      let headerText: string | null = null;
      let footerText: string | null = null;

      for (const comp of raw.components ?? []) {
        const type = (comp.type || "").toUpperCase();
        if (type === "BODY") bodyText = comp.text || "";
        if (type === "HEADER") headerText = comp.text || null;
        if (type === "FOOTER") footerText = comp.text || null;
      }

      // Detect variables from {{var_name}} or {{1}} in the body
      const detectedVars: string[] = [];
      const matches = bodyText.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g);
      for (const match of matches) {
        const rawVar = match[1];
        if (rawVar) {
          const normVar = normalizeVariableName(rawVar);
          if (normVar && !detectedVars.includes(normVar)) {
            detectedVars.push(normVar);
          }
        }
      }

      // Ensure variable names strictly follow Meta rules (lowercase alphanumeric + underscore)
      const sanitizedVars = detectedVars.filter((v) => isValidVariableName(v));

      await upsertWhatsAppTemplateDb(account.id, {
        externalId: raw.id || null,
        name: raw.name,
        language: raw.language,
        category: raw.category || "MARKETING",
        status: (raw.status || "APPROVED").toUpperCase(),
        bodyText,
        headerText,
        footerText,
        variables: sanitizedVars,
        rawMeta: raw as unknown as Record<string, unknown>,
      });

      syncedCount++;
    }

    await updateKapsoAccountDb(account.id, {
      baseUrl,
      lastSyncedAt: new Date(),
    });

    const updatedList = await getWhatsAppTemplatesDb({ accountId: account.id });

    return {
      ok: true,
      synced: syncedCount,
      message: `${syncedCount} modèle(s) synchronisé(s) depuis Kapso avec succès.`,
      templates: updatedList,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const isWabaError =
      !account.businessAccountId &&
      (errMsg.includes("not found") || errMsg.includes("OAuthException") || errMsg.includes("404"));
    const friendlyMessage = isWabaError
      ? "Pour synchroniser les templates Meta, veuillez renseigner votre Business Account ID (WABA ID) dans la configuration du compte (visible dans votre tableau de bord Meta / Kapso)."
      : errMsg;
    return { ok: false, synced: 0, message: friendlyMessage, templates: [] };
  }
}

/**
 * Sends a WhatsApp template via Kapso using DB-synced templates.
 */
export async function sendWhatsAppTemplateViaKapso(options: {
  accountId?: string;
  to: string;
  template: WhatsAppTemplateRow;
  variables: Record<string, string>;
}): Promise<SendTemplateResult> {
  const account = await resolveKapsoAccount(options.accountId || options.template.accountId);
  if (!account) {
    return { ok: false, error: "Aucun compte Kapso configuré" };
  }

  const wa = toWhatsApp(options.to);
  if (!wa.dialable) {
    return { ok: false, error: "Numéro WhatsApp invalide ou non joignable" };
  }

  const baseUrl = normalizeKapsoBaseUrl(account.baseUrl);
  const client = new WhatsAppClient({
    baseUrl,
    kapsoApiKey: account.apiKey,
  });

  // Build parameters matching the template variables
  const parameters = buildMetaParameters(options.template.variables, options.variables);

  try {
    const response = await client.messages.sendTemplate({
      phoneNumberId: account.phoneNumberId,
      to: wa.e164.replace("+", ""),
      template: {
        name: options.template.name,
        language: { code: options.template.language },
        components: parameters.length
          ? [
              {
                type: "body",
                parameters: parameters.map((p) => ({
                  type: "text",
                  text: p.text,
                  ...(p.parameter_name ? { parameter_name: p.parameter_name } : {}),
                })),
              },
            ]
          : undefined,
      },
    });

    const messageId = response.messages[0]?.id;
    return { ok: true, messageId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export { renderTemplateBody };
