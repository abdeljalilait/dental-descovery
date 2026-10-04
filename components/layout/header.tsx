"use client";

import { useState } from "react";
import Link from "next/link";
import { useLockBody } from "@/components/layout/use-lock-body";
import { Menu, X, Building2 } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LeadModal } from "@/components/clinic/lead-modal";
import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/routes";
import { cn } from "@/lib/utils/cn";

export interface HeaderNav {
  home: string;
  dentists: string;
  treatments: string;
  blog: string;
  app: string;
  forClinics: string;
  listClinic: string;
  menu: string;
  close: string;
}

export function Header({ locale, nav }: { locale: Locale; nav: HeaderNav }) {
  const [open, setOpen] = useState(false);
  useLockBody(open);

  const links = [
    { href: localizedPath("dentists", locale), label: nav.dentists },
    { href: localizedPath("treatments", locale), label: nav.treatments },
    { href: localizedPath("blog", locale), label: nav.blog },
    { href: localizedPath("app", locale), label: nav.app },
    { href: localizedPath("forClinics", locale), label: nav.forClinics },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/85 backdrop-blur-xl shadow-soft">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} aria-label="Dentora" className="shrink-0 transition-opacity hover:opacity-90">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1.5 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-pill px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-foreground/80 transition-all hover:bg-primary-soft hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher current={locale} />
          <LeadModal
            type="clinic-claim"
            locale={locale}
            trigger={
              <button className="inline-flex h-9.5 cursor-pointer items-center gap-1.5 rounded-pill bg-primary px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-lift">
                <Building2 className="h-3.5 w-3.5 text-accent" />
                <span>{nav.listClinic}</span>
              </button>
            }
          />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher current={locale} />
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? nav.close : nav.menu}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-pill border border-border bg-surface text-foreground"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-x-0 top-16 z-30 origin-top border-b border-border bg-surface/95 backdrop-blur-xl transition-all duration-200 lg:hidden shadow-lift",
          open ? "visible scale-y-100 opacity-100" : "invisible scale-y-95 opacity-0"
        )}
      >
        <nav aria-label="Mobile" className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-5 sm:px-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-base font-bold text-foreground transition-colors hover:bg-primary-soft hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-border">
            <LeadModal
              type="clinic-claim"
              locale={locale}
              trigger={
                <button
                  onClick={() => setOpen(false)}
                  className="w-full inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-primary text-base font-bold text-white shadow-lift"
                >
                  <Building2 className="h-4.5 w-4.5 text-accent" />
                  <span>{nav.listClinic}</span>
                </button>
              }
            />
          </div>
        </nav>
      </div>
    </header>
  );
}

