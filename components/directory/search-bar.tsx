"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Stethoscope } from "lucide-react";
import { cityDisplayName } from "@/lib/utils/city-display";
import type { City, Specialty } from "@/lib/data/types";
import type { Locale } from "@/lib/i18n/config";
import { cityPath, localizedPath } from "@/lib/routes";
import { cn } from "@/lib/utils/cn";

export function SearchBar({
  locale,
  labels,
  cities,
  specialties,
  variant = "hero",
  defaultCitySlug,
  defaultSpecialtySlug,
}: {
  locale: Locale;
  /** Passed in from the server: this is a client component and cannot query. */
  cities: City[];
  specialties: Specialty[];
  labels: {
    search: string;
    searchCity: string;
    searchSpecialty: string;
    allCities: string;
    allSpecialties: string;
  };
  variant?: "hero" | "compact";
  defaultCitySlug?: string;
  defaultSpecialtySlug?: string;
}) {
  const router = useRouter();
  const [citySlug, setCitySlug] = useState(defaultCitySlug ?? "");
  const [specialtySlug, setSpecialtySlug] = useState(defaultSpecialtySlug ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (citySlug) {
      const target = cityPath(locale, citySlug);
      const query = specialtySlug ? `?spec=${specialtySlug}` : "";
      router.push(`${target}${query}`);
    } else {
      const target = localizedPath("dentists", locale);
      const query = specialtySlug ? `?spec=${specialtySlug}` : "";
      router.push(`${target}${query}`);
    }
  }

  const selectClass =
    "h-12 w-full appearance-none rounded-pill border border-border/80 bg-surface/90 ps-11 pe-8 text-xs sm:text-sm font-semibold text-foreground cursor-pointer transition-all hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shadow-xs";

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface/95 p-3 shadow-lift backdrop-blur-md sm:flex-row sm:items-center",
        variant === "hero" && "sm:p-4 border-white/20 bg-white/95"
      )}
    >
      <div className="relative flex-1">
        <MapPin
          className="pointer-events-none absolute start-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-primary"
          strokeWidth={1.7}
          aria-hidden
        />
        <label className="sr-only" htmlFor="search-city">
          {labels.searchCity}
        </label>
        <select id="search-city" value={citySlug} onChange={(e) => setCitySlug(e.target.value)} className={selectClass}>
          <option value="">{labels.allCities}</option>
          {cities.map((city) => (
            <option key={city.slug} value={city.slug}>
              {cityDisplayName(city, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex-1">
        <Stethoscope
          className="pointer-events-none absolute start-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-primary"
          strokeWidth={1.7}
          aria-hidden
        />
        <label className="sr-only" htmlFor="search-specialty">
          {labels.searchSpecialty}
        </label>
        <select
          id="search-specialty"
          value={specialtySlug}
          onChange={(e) => setSpecialtySlug(e.target.value)}
          className={selectClass}
        >
          <option value="">{labels.allSpecialties}</option>
          {specialties.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name[locale]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-primary px-7 text-sm font-bold text-white transition-all hover:bg-primary-dark hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Search className="h-4.5 w-4.5" strokeWidth={2} aria-hidden />
        {labels.search}
      </button>
    </form>
  );
}
