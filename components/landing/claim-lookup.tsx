"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { searchClinicsByName } from "@/lib/data/clinics";
import { clinicPath } from "@/lib/routes";
import { LeadModal } from "@/components/clinic/lead-modal";

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
    claimCta: string;
    createCta: string;
    viewProfile: string;
    managedLabel: string;
  };
}) {
  const [query, setQuery] = useState("");
  const results = searchClinicsByName(query);
  const showResults = query.trim().length >= 2;

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
          {results.length > 0 ? (
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
