import { CalendarCheck, Award, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/lib/i18n/config";

export function VerifiedBadge({ locale, className }: { locale: Locale; className?: string }) {
  const label = locale === "ar" ? "عيادة موثقة" : "Cabinet Vérifié";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border border-gold/40 bg-gold-soft px-3 py-1 text-xs font-bold text-gold shadow-sm",
        className
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5 text-gold shrink-0" strokeWidth={2.2} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function OnlineBookingBadge({ locale, className }: { locale: Locale; className?: string }) {
  const label = locale === "ar" ? "حجز فوري" : "Rendez-vous direct";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-bold text-accent shadow-sm",
        className
      )}
    >
      <CalendarCheck className="h-3.5 w-3.5 text-accent shrink-0" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function FeaturedBadge({ locale, className }: { locale: Locale; className?: string }) {
  const label = locale === "ar" ? "مميز" : "À la une";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border border-primary/20 bg-primary-soft px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-primary",
        className
      )}
    >
      <Award className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2.2} aria-hidden />
      <span>{label}</span>
    </span>
  );
}


