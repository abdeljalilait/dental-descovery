"use client";

import { useActionState } from "react";
import { importClinicsAction, type ImportReport } from "@/app/admin/clinics-actions";

/**
 * CSV upload with the result of the last import.
 *
 * `useActionState` keeps the report (created/updated counts and per-line errors)
 * next to the form, which is what an operator needs to fix a bad file.
 */
export function ClinicImportForm() {
  const [report, action, pending] = useActionState<ImportReport | null, FormData>(
    importClinicsAction,
    null,
  );

  return (
    <div className="mt-4 space-y-3">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm file:mr-3 file:rounded-pill file:border-0 file:bg-primary-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {pending ? "Importing…" : "Import"}
        </button>
      </form>

      {report ? (
        <div className="rounded-xl bg-background p-3 text-sm">
          <p className="font-medium text-foreground">
            {report.created} created · {report.updated} updated
          </p>
          {report.errors.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-red-700">
              {report.errors.slice(0, 20).map((error, index) => (
                <li key={`${error.line}-${index}`}>
                  {error.line > 0 ? `Line ${error.line}: ` : ""}
                  {error.reason}
                </li>
              ))}
              {report.errors.length > 20 ? (
                <li className="text-muted">…and {report.errors.length - 20} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}