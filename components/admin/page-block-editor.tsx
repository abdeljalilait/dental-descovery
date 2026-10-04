"use client";

import { useActionState } from "react";
import { savePageBlockAction, deletePageBlockAction, type PageBlockFormState } from "@/app/admin/actions";
import type { PageBlockRecord } from "@/lib/repositories/blog";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

const inputClass =
  "w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40";

const localeNames: Record<Locale, string> = { fr: "French", ar: "Arabic" };

function SaveButton() {
  return (
    <button
      type="submit"
      className="inline-flex items-center gap-2 rounded-pill bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-dark"
    >
      Save
    </button>
  );
}

function BlockFields({ record }: { record?: PageBlockRecord }) {
  const [state, formAction] = useActionState(savePageBlockAction, {} as PageBlockFormState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="routeKey" defaultValue={record?.routeKey ?? ""} />
      <input type="hidden" name="blockKey" defaultValue={record?.blockKey ?? ""} />
      <input type="hidden" name="locale" defaultValue={record?.locale ?? "fr"} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <input name="title" placeholder="Title" defaultValue={record?.title ?? ""} className={inputClass} />
        <input name="subtitle" placeholder="Subtitle" defaultValue={record?.subtitle ?? ""} className={inputClass} />
      </div>
      <textarea
        name="content"
        rows={6}
        placeholder="Content (markdown or plain text)"
        defaultValue={record?.content ?? ""}
        className={cn(inputClass, "font-mono text-xs")}
      />
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

export function PageBlockEditor({ records }: { records: PageBlockRecord[] }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Existing blocks</h2>
        {records.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">
            No blocks saved.
          </p>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <details
                key={`${record.routeKey}-${record.locale}-${record.blockKey}`}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                  {record.routeKey}/{record.blockKey}{" "}
                  <span className="font-normal text-muted">· {localeNames[record.locale as Locale]}</span>
                </summary>
                <div className="mt-4 space-y-4">
                  <BlockFields record={record} />
                  <form action={deletePageBlockAction}>
                    <input type="hidden" name="routeKey" value={record.routeKey} />
                    <input type="hidden" name="blockKey" value={record.blockKey} />
                    <input type="hidden" name="locale" value={record.locale} />
                    <button
                      type="submit"
                      className="rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50"
                    >
                      Remove block
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Add a block</h2>
        <div className="max-w-2xl rounded-2xl border border-border bg-surface p-4">
          <BlockFields />
        </div>
      </section>
    </div>
  );
}
