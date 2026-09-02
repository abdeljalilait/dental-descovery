import Link from "next/link";
import { Search } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/routes";

export function MobileCtaBar({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { dentists: string; forClinics: string };
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-2 gap-2 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <Link
          href={localizedPath("dentists", locale)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-primary text-sm font-bold text-white"
        >
          <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
          {labels.dentists}
        </Link>
        <Link
          href={localizedPath("forClinics", locale)}
          className="inline-flex h-11 items-center justify-center rounded-pill border border-primary/40 bg-primary-soft text-sm font-bold text-primary-dark"
        >
          {labels.forClinics}
        </Link>
      </div>
    </div>
  );
}
