import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { getCitiesDb } from "@/lib/repositories/cities";
import { getSpecialtiesDb } from "@/lib/repositories/specialties";
import type { Locale } from "@/lib/i18n/config";
import { cityPath, localizedPath, treatmentPath } from "@/lib/routes";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { siteConfig } from "@/lib/site.config";

export async function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [cities, specialties] = await Promise.all([getCitiesDb(), getSpecialtiesDb()]);

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{dict.footer.tagline}</p>
          </div>

          <nav aria-label={dict.footer.patients}>
            <h3 className="text-sm font-bold text-foreground">{dict.footer.patients}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href={localizedPath("dentists", locale)} className="text-muted transition-colors hover:text-primary">
                  {dict.nav.dentists}
                </Link>
              </li>
              <li>
                <Link href={localizedPath("treatments", locale)} className="text-muted transition-colors hover:text-primary">
                  {dict.nav.treatments}
                </Link>
              </li>
              <li>
                <Link href={localizedPath("blog", locale)} className="text-muted transition-colors hover:text-primary">
                  {dict.nav.blog}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={dict.footer.clinics}>
            <h3 className="text-sm font-bold text-foreground">{dict.footer.clinics}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href={localizedPath("forClinics", locale)} className="text-muted transition-colors hover:text-primary">
                  {dict.nav.forClinics}
                </Link>
              </li>
              <li>
                <Link href={localizedPath("app", locale)} className="text-muted transition-colors hover:text-primary">
                  {dict.nav.app}
                </Link>
              </li>
              <li>
                <Link href={localizedPath("website", locale)} className="text-muted transition-colors hover:text-primary">
                  {dict.websiteSection.eyebrow}
                </Link>
              </li>
              <li>
                <Link href={localizedPath("pricing", locale)} className="text-muted transition-colors hover:text-primary">
                  {dict.pricingTeaser.eyebrow}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={dict.footer.cities}>
            <h3 className="text-sm font-bold text-foreground">{dict.footer.cities}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {(cities ?? []).slice(0, 6).map((city) => (
                <li key={city.slug}>
                  <Link
                    href={cityPath(locale, city.slug)}
                    className="text-muted transition-colors hover:text-primary"
                  >
                    {locale === "ar" ? city.nameAr : city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <nav aria-label={dict.footer.resources} className="mt-10 border-t border-border pt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {(specialties ?? []).slice(0, 4).map((s) => (
              <li key={s.slug}>
                <Link href={treatmentPath(locale, s.slug)} className="text-muted transition-colors hover:text-primary">
                  {s.name[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-center">
          <p>
            © {year} {siteConfig.name}. {dict.footer.rights}
          </p>
          <p className="flex items-center gap-4">
            <Link href={localizedPath("contact", locale)} className="transition-colors hover:text-primary">
              {dict.footer.contactUs}
            </Link>
            <span aria-hidden>·</span>
            <span>{dict.footer.madeIn}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
