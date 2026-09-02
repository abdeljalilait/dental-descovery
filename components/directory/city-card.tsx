import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { City } from "@/lib/data/types";
import type { Locale } from "@/lib/i18n/config";
import { cityPath } from "@/lib/routes";
import { clinicCountByCity } from "@/lib/data/clinics";
import { cn } from "@/lib/utils/cn";

export function CityCard({
  city,
  locale,
  exploreLabel,
  clinicsLabel,
  className,
}: {
  city: City;
  locale: Locale;
  exploreLabel?: string;
  clinicsLabel: string;
  className?: string;
}) {
  const count = clinicCountByCity(city.slug);
  const name = locale === "ar" ? city.nameAr : city.name;

  return (
    <Link
      href={cityPath(locale, city.slug)}
      aria-label={exploreLabel ? `${exploreLabel} - ${name}` : name}
      className={cn(
        "group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift",
        className
      )}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-base font-extrabold text-foreground transition-colors group-hover:text-primary">
          <MapPin className="h-4.5 w-4.5 shrink-0 text-primary" strokeWidth={1.8} aria-hidden />
          <span className="truncate">{name}</span>
        </p>
        <p className="mt-1 text-xs sm:text-sm font-medium text-muted">
          {count > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span>{count} {clinicsLabel}</span>
            </span>
          ) : (
            city.region[locale]
          )}
        </p>
      </div>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-primary transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-sm">
        <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={2.2} aria-hidden />
      </span>
    </Link>
  );
}
