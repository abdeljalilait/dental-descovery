"use client";

import { useState } from "react";
import { sendClinicTemplateAction } from "@/app/admin/clinics-actions";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign/templates";

/**
 * Send an approved template to one clinic.
 *
 * Dry run is the default and the only mode that reports without spending a
 * message; switching to live additionally requires the explicit confirmation
 * checkbox, so a stray click cannot bill WhatsApp messages.
 *
 * The send itself runs in the background (`after()` in the action) and its
 * progress appears in the "Recent runs" panel on the jobs page, so this control
 * does not need to hold the request open.
 */
export function SendTemplateControl({
  slug,
  whatsapp,
}: {
  slug: string;
  whatsapp: string;
}) {
  const [templateKey, setTemplateKey] = useState(CAMPAIGN_TEMPLATES[0]?.key ?? "");
  const [mode, setMode] = useState<"dry" | "live">("dry");
  const [confirmLive, setConfirmLive] = useState(false);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-pill border border-primary px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
      >
        Send template
      </button>
    );
  }

  return (
    <form action={sendClinicTemplateAction} className="w-64 space-y-2 rounded-xl border border-border bg-background p-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="templateKey" value={templateKey} />
      <input type="hidden" name="mode" value={mode} />
      {confirmLive ? <input type="hidden" name="confirmLive" value="yes" /> : null}

      <p className="font-mono text-xs text-muted">{whatsapp}</p>

      <select
        value={templateKey}
        onChange={(event) => setTemplateKey(event.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
      >
        {CAMPAIGN_TEMPLATES.map((template) => (
          <option key={template.key} value={template.key}>
            {template.name}
          </option>
        ))}
      </select>

      <select
        value={mode}
        onChange={(event) => setMode(event.target.value as "dry" | "live")}
        className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
      >
        <option value="dry">Dry run</option>
        <option value="live">Live send</option>
      </select>

      {mode === "live" ? (
        <label className="flex items-center gap-2 text-xs text-red-700">
          <input
            type="checkbox"
            checked={confirmLive}
            onChange={(event) => setConfirmLive(event.target.checked)}
          />
          Send for real
        </label>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={mode === "live" && !confirmLive}
          className="rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}