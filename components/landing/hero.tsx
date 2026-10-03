import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getCitiesDb } from "@/lib/repositories/cities";
import { getSpecialtiesDb } from "@/lib/repositories/specialties";
import { getDirectoryStatsDb } from "@/lib/repositories/stats";
import { cityPath, localizedPath } from "@/lib/routes";
import { SearchBar } from "@/components/directory/search-bar";

export async function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [allCities, specialties, stats] = await Promise.all([
    getCitiesDb(),
    getSpecialtiesDb(),
    getDirectoryStatsDb(),
  ]);
  const popular = allCities.filter((c) => c.featured).slice(0, 5);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-dark via-primary to-primary-dark text-white">
      {/* Subtle Luminous Mesh Backdrops */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary-light/20 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-40 h-[400px] w-[500px] rounded-full bg-accent/15 blur-[100px]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-10" aria-hidden />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-md shadow-sm">
            <BadgeCheck className="h-4 w-4 text-accent" strokeWidth={2.2} aria-hidden />
            <span>{dict.hero.eyebrow}</span>
          </div>

          <h1 className="display-heading mt-6 text-balance text-4xl sm:text-5xl lg:text-6xl font-black">
            {dict.hero.title}{" "}
            <span className="block bg-gradient-to-r from-primary-light via-accent-soft to-white bg-clip-text text-transparent sm:inline">
              {dict.hero.titleHighlight}
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base sm:text-lg leading-relaxed text-white/85">
            {dict.hero.subtitle}
          </p>

          {/* Social Proof Mini Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-white/80">
            <span className="flex items-center gap-1">
              <span className="flex text-gold">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current text-gold" />
                ))}
              </span>
              {/* Real figures from the directory, not a marketing claim. */}
              <strong className="font-bold text-white">
                {stats.averageRating.toFixed(1).replace(".", locale === "ar" ? "٫" : ",")}/5
              </strong>{" "}
              ({stats.reviewCount.toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR")}+ {dict.hero.verifiedReviews})
            </span>
            <span className="h-3 w-px bg-white/20" />
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              <span>
                {stats.cityCount} {dict.hero.citiesCoverage} • {dict.hero.freeForever}
              </span>
            </span>
          </div>
        </div>

        {/* Search Bar Glass Panel */}
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/20 bg-white/10 p-2 sm:p-3 backdrop-blur-xl shadow-glass">
          <SearchBar
            locale={locale}
            variant="hero"
            cities={allCities}
            specialties={specialties}
            labels={{
              search: dict.common.search,
              searchCity: dict.common.searchCity,
              searchSpecialty: dict.common.searchSpecialty,
              allCities: dict.common.allCities,
              allSpecialties: dict.common.allSpecialties,
            }}
          />
        </div>

        {/* Popular Cities Pills */}
        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-white/80">
          <span className="font-bold text-white">{dict.hero.popularCities}</span>
          {popular.map((city) => (
            <Link
              key={city.slug}
              href={cityPath(locale, city.slug)}
              className="inline-flex items-center gap-1 rounded-pill border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white hover:text-primary-dark hover:-translate-y-0.5"
            >
              <MapPin className="h-3.5 w-3.5 text-accent shrink-0" strokeWidth={2} aria-hidden />
              <span>{locale === "ar" ? city.nameAr : city.name}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href={localizedPath("treatments", locale)}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-white/90 hover:text-white transition-colors underline underline-offset-4"
          >
            <span>{dict.hero.ctaSecondary}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

