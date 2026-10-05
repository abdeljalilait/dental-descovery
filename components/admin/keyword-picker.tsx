"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface KeywordGroup {
  id: string;
  label: string;
  hint?: string;
  /** Google interface language for the group's queries, shown as a hint. */
  hl?: string;
  keywords: string[];
}

/** Live SerpApi quota when the key is valid, else null. */
export type KeywordPickerAccount = {
  totalSearchesLeft: number;
  searchesPerMonth: number;
  planName: string;
} | null;

export interface KeywordPickerProps {
  groups: KeywordGroup[];
  /** Cities offered in the target select; `""` means every city. */
  cities: Array<{ slug: string; name: string }>;
  account: KeywordPickerAccount;
}

/**
 * Keyword multi-select for the SerpApi sync, with a live credit estimate.
 *
 * Every SerpApi call is billed, so the point of this control is that the operator
 * sees what a run will cost before starting it. Keywords are plain checkboxes
 * named `keywords`, which keeps the form working without JavaScript; only the
 * estimate and the presets need state.
 */
export function KeywordPicker({ groups, cities, account }: KeywordPickerProps) {
  const allKeywords = useMemo(() => groups.flatMap((group) => group.keywords), [groups]);

  const [selected, setSelected] = useState<string[]>(() => groups[0]?.keywords.slice(0, 1) ?? []);
  const [city, setCity] = useState<string>("");

  const cityCount = city ? 1 : cities.length;
  const estimated = selected.length * cityCount;
  const overBudget = account ? estimated > account.totalSearchesLeft : false;

  const toggle = (keyword: string) => {
    setSelected((current) =>
      current.includes(keyword)
        ? current.filter((item) => item !== keyword)
        : // Keep catalogue order so the posted list matches the UI order.
          allKeywords.filter((item) => item === keyword || current.includes(item)),
    );
  };

  const preset = (keywords: string[]) => setSelected(keywords);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Keywords</span>
        <button
          type="button"
          onClick={() => preset(allKeywords)}
          className="rounded-pill border border-border px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
        >
          Select all ({allKeywords.length})
        </button>
        <button
          type="button"
          onClick={() => preset([groups[0]?.keywords[0]].filter(Boolean) as string[])}
          className="rounded-pill border border-border px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
        >
          Primary only
        </button>
        <button
          type="button"
          onClick={() => preset([])}
          className="rounded-pill border border-border px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
        >
          Clear
        </button>
      </div>

      {groups.map((group) => (
        <fieldset key={group.id}>
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
            {group.label}
            {group.hl && group.hl !== "fr" ? (
              <span className="ms-1.5 font-normal normal-case tracking-normal text-muted">
                searches in {group.hl}
              </span>
            ) : null}
          </legend>
          {group.hint ? <p className="mb-2 text-xs text-muted">{group.hint}</p> : null}
          <div className="flex flex-wrap gap-2">
            {group.keywords.map((keyword) => {
              const active = selected.includes(keyword);
              return (
                <label
                  key={keyword}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-muted hover:border-primary hover:text-primary",
                  )}
                >
                  <input
                    type="checkbox"
                    name="keywords"
                    value={keyword}
                    checked={active}
                    onChange={() => toggle(keyword)}
                    className="sr-only"
                  />
                  {active ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : null}
                  {keyword}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Target</span>
          <select
            name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2"
          >
            <option value="">All Moroccan cities ({cities.length})</option>
            {cities.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Max searches (optional)</span>
          <input
            name="maxSearches"
            type="number"
            min={1}
            max={250}
            placeholder={String(Math.min(estimated, 250))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2"
          />
        </label>
      </div>

      <div
        className={cn(
          "rounded-xl border p-3 text-sm",
          overBudget ? "border-amber-200 bg-amber-50 text-amber-900" : "border-border bg-background text-muted",
        )}
      >
        <p>
          <strong>
            {`${selected.length} keyword${selected.length === 1 ? "" : "s"} × ${cityCount} ${
              cityCount === 1 ? "city" : "cities"
            }`}
          </strong>{" "}
          = <strong>{estimated}</strong> SerpApi credit{estimated === 1 ? "" : "s"}
          {account ? (
            <>
              {" · "}
              {account.totalSearchesLeft} left of {account.searchesPerMonth} on the{" "}
              {account.planName} plan this month
            </>
          ) : (
            " · live quota unavailable, so the monthly cap still applies"
          )}
        </p>
        {overBudget && account ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            That exceeds your remaining quota. The run will stop early at the cap rather than
            finish every city.
          </p>
        ) : null}
        {selected.length === 0 ? (
          <p className="mt-1 text-xs font-medium">
            No keyword selected: the run will fall back to the primary keyword only.
          </p>
        ) : null}
      </div>
    </div>
  );
}