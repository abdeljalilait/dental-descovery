import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import type { Clinic } from "@/lib/data/types";
import { cityDisplayName } from "@/lib/utils/city-display";
import { getCityForRender } from "@/lib/repositories/cities";
import type { Locale } from "@/lib/i18n/config";
import { clinicPath } from "@/lib/routes";
import { cn } from "@/lib/utils/cn";
import { RatingValue } from "@/components/ui/rating";
import { VerifiedBadge, OnlineBookingBadge, FeaturedBadge } from "@/components/ui/badges";

export async function ClinicCard({
  clinic,
  locale,
  dict,
  className,
}: {
  clinic: Clinic;
  locale: Locale;
  dict: { viewProfile: string; ratingSource: string; callNow: string };
  className?: string;
}) {
  const city = await getCityForRender(clinic.citySlug);
  const href = clinicPath(locale, clinic.citySlug, clinic.slug);
  // Specialties arrive resolved on the clinic row, so no per-card lookup.
  const firstSpecialty = clinic.specialties[0];

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lift",
        className
      )}
    >
      <Link href={href} className="block" aria-label={clinic.name}>
        <div className="relative flex h-32 items-end justify-between overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-light p-4 text-white">
          <div
            className="absolute inset-0 bg-grid-subtle opacity-15"
            aria-hidden
          />
          <div className="relative z-10 flex flex-wrap gap-2">
            {clinic.verified ? <VerifiedBadge locale={locale} /> : null}
            {clinic.usesApp ? <OnlineBookingBadge locale={locale} /> : null}
            {clinic.rating >= 4.9 ? <FeaturedBadge locale={locale} /> : null}
          </div>
          {firstSpecialty ? (
            <span className="relative z-10 rounded-pill bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/20">
              {firstSpecialty.name[locale]}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0">
            <h3 className="truncate text-base sm:text-lg font-black leading-snug text-foreground transition-colors group-hover:text-primary">
              {locale === "ar" ? clinic.nameAr : clinic.name}
            </h3>
          </Link>
          <RatingValue
            rating={clinic.rating}
            reviewCount={clinic.reviewCount}
            source={dict.ratingSource}
            size={13}
            className="shrink-0 pt-0.5"
          />
        </div>

        <p className="mt-2.5 flex items-center gap-1.5 text-xs sm:text-sm text-muted">
          <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} aria-hidden />
          <span className="truncate">
            {city ? `${clinic.neighborhood[locale]} · ${cityDisplayName(city, locale)}` : clinic.neighborhood[locale]}
          </span>
        </p>

        {/* Specialties Tags */}
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {clinic.specialties.slice(0, 3).map((specialty) => {
            return (
              <span
                key={specialty.slug}
                className="rounded-pill border border-border-subtle bg-surface-subtle px-2.5 py-0.5 text-[11px] font-semibold text-muted"
              >
                {specialty.name[locale]}
              </span>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex items-center gap-2 pt-6">
          {clinic.phoneHref ? (
            <a
              href={`tel:${clinic.phoneHref}`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-pill border border-border bg-surface text-xs sm:text-sm font-bold text-foreground transition-all hover:border-primary hover:text-primary hover:bg-primary-soft/50"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              <span>{dict.callNow}</span>
            </a>
          ) : null}
          <Link
            href={href}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-pill bg-primary text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-lift"
          >
            {dict.viewProfile}
          </Link>
        </div>
      </div>
    </article>
  );
}

