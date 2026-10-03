"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deletePageSeoAction, savePageSeoAction, type PageSeoFormState } from "@/app/admin/actions";
import type { PageSeoRecord } from "@/lib/data/types";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary";

/**
 * Route keys that consume `buildDynamicMetadata`, i.e. the ones an override
 * here actually affects. Offering a free-text key would let an editor save a
 * row that nothing ever reads.
 */
const KNOWN_ROUTE_KEYS = [
  { key: "home", label: "Home" },
  { key: "dentists", label: "Dentists directory" },
  { key: "treatments", label: "Treatments index" },
  { key: "blog", label: "Blog index" },
  { key: "app", label: "Dental App" },
  { key: "forClinics", label: "For clinics" },
  { key: "website", label: "Website offering" },
  { key: "pricing", label: "Pricing" },
  { key: "contact", label: "Contact" },
];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

function SeoFields({ record }: { record?: PageSeoRecord }) {
  const [state, formAction] = useActionState<PageSeoFormState, FormData>(savePageSeoAction, {});

  return (
    <form action={formAction} className="space-y-3">
      {record ? (
        <>
          <input type="hidden" name="routeKey" value={record.routeKey} />
          <input type="hidden" name="locale" value={record.locale} />
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="routeKey" required className={inputClass} defaultValue="blog">
            {KNOWN_ROUTE_KEYS.map((route) => (
              <option key={route.key} value={route.key}>
                {route.label}
              </option>
            ))}
          </select>
          <select name="locale" required className={inputClass} defaultValue="fr">
            {locales.map((locale) => (
              <option key={locale} value={locale}>
                {localeNames[locale]}
              </option>
            ))}
          </select>
        </div>
      )}

      <input
        name="metaTitle"
        placeholder="Meta title (empty = page default)"
        defaultValue={record?.metaTitle ?? ""}
        className={inputClass}
      />
      <textarea
        name="metaDescription"
        rows={2}
        placeholder="Meta description (empty = page default)"
        defaultValue={record?.metaDescription ?? ""}
        className={inputClass}
      />
      <input
        name="keywords"
        placeholder="Keywords, comma separated"
        defaultValue={record?.keywords ?? ""}
        className={inputClass}
      />
      <input
        name="ogImageUrl"
        type="url"
        placeholder="Open Graph image URL"
        defaultValue={record?.ogImageUrl ?? ""}
        className={`${inputClass} font-mono text-xs`}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="canonicalUrl"
          type="url"
          placeholder="Canonical URL override"
          defaultValue={record?.canonicalUrl ?? ""}
          className={`${inputClass} font-mono text-xs`}
        />
        <input
          name="metaRobots"
          placeholder="Robots, e.g. noindex"
          defaultValue={record?.metaRobots ?? ""}
          className={`${inputClass} font-mono text-xs`}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.saved ? <p className="text-xs text-emerald-700">Saved.</p> : null}

      <SaveButton />
    </form>
  );
}

export function PageSeoEditor({ records }: { records: PageSeoRecord[] }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Existing overrides
        </h2>
        {records.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">
            No overrides. Every page currently uses its built-in metadata.
          </p>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <details
                key={`${record.routeKey}-${record.locale}`}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                  {record.routeKey}{" "}
                  <span className="font-normal text-muted">
                    · {localeNames[record.locale as Locale]}
                  </span>
                  <span className="ms-2 font-normal text-xs text-muted">
                    {record.metaTitle || "(no title override)"}
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                  <SeoFields record={record} />
                  <form action={deletePageSeoAction}>
                    <input type="hidden" name="routeKey" value={record.routeKey} />
                    <input type="hidden" name="locale" value={record.locale} />
                    <button
                      type="submit"
                      className="rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50"
                    >
                      Remove override
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Add an override
        </h2>
        <div className="max-w-2xl rounded-2xl border border-border bg-surface p-4">
          <SeoFields />
        </div>
      </section>
    </div>
  );
}