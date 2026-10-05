"use client";

import { toggleClinicFlagAction } from "@/app/admin/clinics-actions";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Inline flag toggle for the clinic table with instant pending spinner.
 */
export function ToggleFlagButton({
  slug,
  field,
  value,
  label,
}: {
  slug: string;
  field: "usesApp" | "verified";
  value: boolean;
  label: string;
}) {
  return (
    <form action={toggleClinicFlagAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={value ? "false" : "true"} />
      <SubmitButton
        aria-pressed={value}
        title={`Mark as ${value ? `not ${label.toLowerCase()}` : label}`}
        className={
          value
            ? "rounded-pill bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            : "rounded-pill bg-surface-subtle px-2 py-0.5 text-xs font-medium text-muted transition-colors hover:bg-border"
        }
      >
        {label}
      </SubmitButton>
    </form>
  );
}