import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-dark via-primary to-primary-dark text-white">
      {/* Subtle Luminous Mesh Backdrops */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[350px] w-[600px] rounded-full bg-primary-light/20 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-32 h-[300px] w-[400px] rounded-full bg-accent/15 blur-[90px]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-10" aria-hidden />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8 lg:py-18">
        {crumbs && crumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="inline-flex flex-wrap items-center gap-1.5 rounded-pill bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md border border-white/10">
              {crumbs.map((crumb, i) => (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {crumb.href ? (
                    <Link href={crumb.href} className="transition-colors hover:text-white font-medium">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-white font-bold" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                  {i < crumbs.length - 1 ? (
                    <ChevronRight className="h-3 w-3 rtl:rotate-180 text-white/50" strokeWidth={2.2} aria-hidden />
                  ) : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {eyebrow ? (
          <div className="inline-block rounded-pill border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="display-heading mt-4 max-w-3xl text-balance text-3xl sm:text-4xl lg:text-5xl font-black">{title}</h1>
        {subtitle ? <div className="mt-4 max-w-2xl text-pretty text-sm sm:text-base leading-relaxed text-white/85">{subtitle}</div> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
