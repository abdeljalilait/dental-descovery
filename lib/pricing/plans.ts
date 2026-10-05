import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PricingPlanRecord, PricingPlanView } from "@/lib/data/types";
import { isLeadType } from "@/lib/data/types";
import { getActivePricingPlansDb } from "@/lib/repositories/pricing";

function getDefaultDictPlans(dict: Dictionary): PricingPlanView[] {
  return [
    {
      key: "free",
      name: dict.pricingTeaser.free.name,
      price: dict.pricingTeaser.free.price,
      period: dict.pricingTeaser.free.period,
      features: dict.pricingTeaser.free.features,
      cta: dict.pricingTeaser.free.cta,
      leadType: "clinic-claim",
      highlighted: false,
      sortOrder: 10,
    },
    {
      key: "pro",
      name: dict.pricingTeaser.pro.name,
      price: dict.pricingTeaser.pro.price,
      period: dict.pricingTeaser.pro.period,
      features: dict.pricingTeaser.pro.features,
      cta: dict.pricingTeaser.pro.cta,
      leadType: "app-demo",
      badge: dict.pricingTeaser.pro.badge,
      highlighted: true,
      sortOrder: 20,
    },
    {
      key: "website",
      name: dict.pricingTeaser.website.name,
      price: dict.pricingTeaser.website.price,
      period: dict.pricingTeaser.website.period,
      features: dict.pricingTeaser.website.features,
      cta: dict.pricingTeaser.website.cta,
      leadType: "website-quote",
      highlighted: false,
      sortOrder: 30,
    },
  ];
}

type TeaserDictItem = {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  badge?: string;
};

function getDictItem(dict: Dictionary, key: string): TeaserDictItem | undefined {
  const teaser = dict.pricingTeaser as Record<string, unknown>;
  const val = teaser[key];
  if (val && typeof val === "object" && "name" in val && "price" in val) {
    return val as TeaserDictItem;
  }
  return undefined;
}

/**
 * Resolves active pricing plans for a locale.
 * Merges DB rows over dictionary plans field-by-field.
 * If no rows or all plans are inactive, returns the 3 default dictionary plans byte-identically.
 */
export async function getResolvedPricingPlans(
  locale: Locale,
  dict: Dictionary
): Promise<PricingPlanView[]> {
  const rows = await getActivePricingPlansDb();

  if (!rows || rows.length === 0) {
    return getDefaultDictPlans(dict);
  }

  // Sort plans by sortOrder asc, key asc
  const sortedRows = [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.key.localeCompare(b.key);
  });

  let firstHighlightedEncountered = false;

  return sortedRows.map((row: PricingPlanRecord) => {
    const dictItem = getDictItem(dict, row.key);

    const name =
      (locale === "ar" ? row.name.ar : row.name.fr) || dictItem?.name || "";
    const price =
      (locale === "ar" ? row.price.ar : row.price.fr) || dictItem?.price || "";
    const period =
      (locale === "ar" ? row.period.ar : row.period.fr) || dictItem?.period || "";
    const cta =
      (locale === "ar" ? row.cta.ar : row.cta.fr) || dictItem?.cta || "";

    const rawBadge = locale === "ar" ? row.badge.ar : row.badge.fr;
    const badge = rawBadge || dictItem?.badge || undefined;

    const rowFeatures = locale === "ar" ? row.features.ar : row.features.fr;
    const features =
      rowFeatures && rowFeatures.length > 0
        ? rowFeatures
        : dictItem?.features ?? [];

    const leadType = isLeadType(row.leadType) ? row.leadType : "app-demo";

    let highlighted = false;
    if (row.highlighted && !firstHighlightedEncountered) {
      highlighted = true;
      firstHighlightedEncountered = true;
    }

    return {
      key: row.key,
      name,
      price,
      period,
      features,
      cta,
      leadType,
      badge: badge || undefined,
      highlighted,
      sortOrder: row.sortOrder,
    };
  });
}
