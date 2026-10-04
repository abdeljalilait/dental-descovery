import { toggleClinicFlagAction } from "@/app/admin/clinics-actions";

/**
 * Inline flag toggle for the clinic table.
 *
 * A plain form posting to a server action rather than a client component: the
 * table stays usable with JavaScript disabled, and the value shown always comes
 * from a render after the write, so the UI cannot drift from the database.
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
      <button
        type="submit"
        aria-pressed={value}
        title={`Mark as ${value ? `not ${label.toLowerCase()}` : label}`}
        className={
          value
            ? "rounded-pill bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            : "rounded-pill bg-surface-subtle px-2 py-0.5 text-xs font-medium text-muted transition-colors hover:bg-border"
        }
      >
        {label}
      </button>
    </form>
  );
}