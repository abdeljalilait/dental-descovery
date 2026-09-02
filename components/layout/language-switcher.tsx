"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() ?? "/";

  return (
    <nav aria-label="Language" className="flex items-center gap-1 rounded-pill bg-primary-soft p-1">
      {locales.map((locale) => {
        const target = pathname.replace(`/${current}`, `/${locale}`);
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={target}
            hrefLang={locale}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-pill px-3 py-1 text-xs font-bold transition-colors",
              active ? "bg-primary text-white" : "text-primary-dark hover:bg-primary/10"
            )}
          >
            {locale === "ar" ? "ع" : locale.toUpperCase()}
            <span className="sr-only">{localeNames[locale]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
