"use client";

import { Check, Crown } from "lucide-react";
import { LeadModal } from "@/components/clinic/lead-modal";
import type { Locale } from "@/lib/i18n/config";
import type { PricingPlanView } from "@/lib/data/types";
import { cn } from "@/lib/utils/cn";

export interface PricingPlansProps {
  plans: PricingPlanView[];
  locale: Locale;
  headingLevel?: "h2" | "h3";
  showCrownBadge?: boolean;
}

export function PricingPlans({
  plans,
  locale,
  headingLevel = "h2",
  showCrownBadge = false,
}: PricingPlansProps) {
  const HeadingTag = headingLevel;

  return (
    <div
      className={cn(
        "grid gap-8 items-stretch",
        plans.length === 1 && "max-w-md mx-auto",
        plans.length === 2 && "sm:grid-cols-2 max-w-3xl mx-auto",
        plans.length === 3 && "lg:grid-cols-3",
        plans.length === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        plans.length >= 5 && "sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {plans.map((plan) => (
        <article
          key={plan.key || plan.name}
          className={cn(
            "relative flex h-full flex-col rounded-2xl border p-8 transition-all duration-300",
            plan.highlighted
              ? "border-primary/50 bg-gradient-to-b from-primary-soft/40 via-surface to-surface shadow-lift scale-105 z-10"
              : "border-border/80 bg-surface shadow-soft hover:border-primary/30 hover:shadow-card"
          )}
        >
          {plan.badge ? (
            <div className="absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-4 py-1 text-xs font-extrabold text-white shadow-md">
                {showCrownBadge ? (
                  <Crown className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} />
                ) : null}
                <span>{plan.badge}</span>
              </span>
            </div>
          ) : null}
          <HeadingTag className="text-xl font-extrabold text-foreground">{plan.name}</HeadingTag>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-primary">
              {plan.price}
            </span>
            <span className="text-xs font-medium text-muted">{plan.period}</span>
          </p>
          <ul className="mt-8 flex-1 space-y-3.5 border-t border-border/60 pt-6">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-xs sm:text-sm text-foreground">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <LeadModal
              type={plan.leadType}
              locale={locale}
              planKey={plan.key}
              trigger={
                <button
                  type="button"
                  className={cn(
                    "w-full cursor-pointer h-12 rounded-pill font-bold text-sm shadow-sm transition-all hover:scale-[1.02]",
                    plan.highlighted
                      ? "bg-primary text-white hover:bg-primary-dark hover:shadow-lift"
                      : "bg-primary-soft text-primary-dark hover:bg-primary hover:text-white"
                  )}
                >
                  {plan.cta}
                </button>
              }
            />
          </div>
        </article>
      ))}
    </div>
  );
}
