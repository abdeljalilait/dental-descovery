import { WhatsAppClient } from "@kapso/whatsapp-cloud-api";
import { toWhatsApp } from "@/lib/utils/phone";

export interface KapsoSendOptions {
  /** Raw Moroccan number in any format; normalised to E.164 before sending. */
  to: string;
  /** Template name as approved in the Kapso dashboard. */
  template: string;
  /** Template language code, e.g. `fr` or `ar`. */
  language: string;
  /**
   * Body placeholders in template order. These become the `body` component
   * parameters the Cloud API expects, so the values must match the approved
   * template's variable order exactly.
   */
  variables: string[];
}

export interface KapsoSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface KapsoConfig {
  baseUrl: string;
  apiKey?: string;
  phoneNumberId?: string;
  /** True only when both the API key and the sender id are present. */
  configured: boolean;
}

export function getKapsoConfig(): KapsoConfig {
  return {
    baseUrl: process.env.KAPSO_BASE_URL || "https://app.kapso.ai/api/meta/",
    apiKey: process.env.KAPSO_API_KEY,
    phoneNumberId: process.env.KAPSO_PHONE_NUMBER_ID,
    configured: Boolean(process.env.KAPSO_API_KEY && process.env.KAPSO_PHONE_NUMBER_ID),
  };
}

/**
 * Send an approved WhatsApp template through Kapso.
 *
 * The SDK mirrors Meta's Cloud API, so the payload stays portable: only the
 * `baseUrl`/`kapsoApiKey` pair changes between Kapso and Meta directly.
 */
export async function sendWhatsAppViaKapso(opts: KapsoSendOptions): Promise<KapsoSendResult> {
  const cfg = getKapsoConfig();
  const wa = toWhatsApp(opts.to);

  if (!wa.dialable) return { ok: false, error: "Invalid or non-dialable WhatsApp number" };
  if (!cfg.apiKey) return { ok: false, error: "KAPSO_API_KEY is not configured" };
  if (!cfg.phoneNumberId) return { ok: false, error: "KAPSO_PHONE_NUMBER_ID is not configured" };

  const client = new WhatsAppClient({
    baseUrl: cfg.baseUrl,
    kapsoApiKey: cfg.apiKey,
  });

  try {
    const response = await client.messages.sendTemplate({
      phoneNumberId: cfg.phoneNumberId,
      to: wa.e164.replace("+", ""),
      template: {
        name: opts.template,
        language: { code: opts.language },
        components: opts.variables.length
          ? [
              {
                type: "body",
                parameters: opts.variables.map((text) => ({ type: "text", text })),
              },
            ]
          : undefined,
      },
    });

    return { ok: true, messageId: response.messages[0]?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export { toWhatsApp } from "@/lib/utils/phone";