"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { clinicPath } from "@/lib/routes";
import { LeadModal } from "@/components/clinic/lead-modal";

/** The subset of `Clinic` the lookup renders, as returned by /api/clinics/search. */
interface LookupResult {
  slug: string;
  citySlug: string;
  name: string;
  nameAr: string;
  address: Record<Locale, string>;
  claimed: boolean;
}

export function ClaimLookup({
  locale,
  labels,
}: {
  locale: Locale;
  labels: {
    lookupLabel: string;
    lookupPlaceholder: string;
    lookupFound: string;
    lookupFoundDesc: string;
    lookupNotFound: string;
    lookupNotFoundDesc: string;
    lookupSearching: string;
    claimCta: string;
    createCta: string;
    viewProfile: string;
    managedLabel: string;
  };
}) {
  const [query, setQuery] = useState("");
  // The response is tagged with the term that produced it, so a stale answer for
  // a previous keystroke is ignored during render instead of needing an effect
  // to clear it.
  const [response, setResponse] = useState<{ term: string; results: LookupResult[] } | null>(null);
  // Guards against a slow earlier request overwriting a newer result set.
  const requestId = useRef(0);

  const trimmed = query.trim();
  const showResults = trimmed.length >= 2;
  const results = response?.term === trimmed ? response.results : [];
  const isSearching = showResults && response?.term !== trimmed;

  useEffect(() => {
    if (trimmed.length < 2) return;

    const current = ++requestId.current;

    // Debounced so typing a practice name issues one request, not one per key.
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clinics/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error(`search failed: ${res.status}`);
        const data = (await res.json()) as { clinics: LookupResult[] };
        if (current === requestId.current) {
          setResponse({ term: trimmed, results: data.clinics ?? [] });
        }
      } catch (error) {
        console.error("Clinic lookup failed:", error);
        if (current === requestId.current) {
          setResponse({ term: trimmed, results: [] });
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [trimmed]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary"
          strokeWidth={1.7}
          aria-hidden
        />
        <label className="sr-only" htmlFor="claim-lookup">
          {labels.lookupLabel}
        </label>
        <input
          id="claim-lookup"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.lookupPlaceholder}
          className="h-14 w-full rounded-pill border border-border bg-surface ps-13 pe-5 text-base text-foreground shadow-card placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>

      {showResults ? (
        <div className="mt-4 overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {isSearching ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted">{labels.lookupSearching}</p>
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-border">
              {results.map((clinic) => (
                <li key={clinic.slug} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold text-foreground">
                      <Building2 className="h-4.5 w-4.5 shrink-0 text-primary" strokeWidth={1.7} aria-hidden />
                      {locale === "ar" ? clinic.nameAr : clinic.name}
                      {clinic.claimed ? (
                        <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                          {labels.managedLabel}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {clinic.claimed
                        ? labels.lookupFoundDesc
                        : `${clinic.address[locale]}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={clinicPath(locale, clinic.citySlug, clinic.slug)}
                      className="text-xs sm:text-sm font-bold text-primary transition-colors hover:text-primary-dark"
                    >
                      {labels.viewProfile}
                    </Link>
                    {!clinic.claimed ? (
                      <LeadModal
                        type="clinic-claim"
                        locale={locale}
                        clinicName={locale === "ar" ? clinic.nameAr : clinic.name}
                        trigger={
                          <button className="inline-flex h-9.5 cursor-pointer items-center rounded-pill bg-accent px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow-lift">
                            {labels.claimCta}
                          </button>
                        }
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center">
              <p className="font-bold text-foreground">{labels.lookupNotFound}</p>
              <p className="mt-1 text-sm text-muted">{labels.lookupNotFoundDesc}</p>
              <div className="mt-4">
                <LeadModal
                  type="clinic-claim"
                  locale={locale}
                  trigger={
                    <button className="inline-flex h-11 cursor-pointer items-center rounded-pill bg-primary px-5 text-sm font-bold text-white transition-all hover:bg-primary-dark hover:shadow-lift">
                      {labels.createCta}
                    </button>
                  }
                />
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
