import prisma from "@/lib/prisma";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { toJson } from "@/src/prisma/codecs";
import type {
  LeadType,
  PricingPlanInput,
  PricingPlanRecord,
} from "@/lib/data/types";
import { isLeadType } from "@/lib/data/types";

function toInstantString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return [];
}

function toLeadType(value: string): LeadType {
  return isLeadType(value) ? value : "app-demo";
}

/**
 * Shared row projection. Returns every column matching lib/repositories/blog.ts.
 */
const pricingPlanRows = () => prisma.orm.public.PricingPlan;

type PricingPlanRow = ResultType<ReturnType<typeof pricingPlanRows>>;

function mapPricingPlanRow(row: PricingPlanRow): PricingPlanRecord {
  return {
    id: row.id,
    key: row.key,
    active: row.active,
    highlighted: row.highlighted,
    sortOrder: row.sortOrder,
    leadType: toLeadType(row.leadType),
    name: { fr: row.nameFr, ar: row.nameAr },
    price: { fr: row.priceFr, ar: row.priceAr },
    period: { fr: row.periodFr, ar: row.periodAr },
    cta: { fr: row.ctaFr, ar: row.ctaAr },
    badge: { fr: row.badgeFr, ar: row.badgeAr },
    features: {
      fr: toStringArray(row.featuresFr),
      ar: toStringArray(row.featuresAr),
    },
    createdAt: toInstantString(row.createdAt),
    updatedAt: toInstantString(row.updatedAt),
  };
}

export async function listPricingPlansDb(): Promise<PricingPlanRecord[]> {
  try {
    const rows = await pricingPlanRows()
      .orderBy((p) => p.sortOrder.asc())
      .orderBy((p) => p.key.asc())
      .all();
    return rows.map(mapPricingPlanRow);
  } catch (error) {
    console.error("Failed to list pricing plans:", error);
    return [];
  }
}

export async function getActivePricingPlansDb(): Promise<PricingPlanRecord[]> {
  try {
    const rows = await pricingPlanRows()
      .where((p) => p.active.eq(true))
      .orderBy((p) => p.sortOrder.asc())
      .orderBy((p) => p.key.asc())
      .all();
    return rows.map(mapPricingPlanRow);
  } catch (error) {
    console.error("Failed to get active pricing plans:", error);
    return [];
  }
}

export async function getPricingPlanByKeyDb(key: string): Promise<PricingPlanRecord | undefined> {
  const row = await pricingPlanRows().where((p) => p.key.eq(key)).first();
  return row ? mapPricingPlanRow(row) : undefined;
}

export async function upsertPricingPlanDb(input: PricingPlanInput): Promise<PricingPlanRecord> {
  const row = await prisma.orm.public.PricingPlan.upsert({
    conflictOn: { key: input.key },
    update: {
      active: input.active,
      highlighted: input.highlighted,
      sortOrder: input.sortOrder,
      leadType: input.leadType,
      nameFr: input.name.fr,
      nameAr: input.name.ar,
      priceFr: input.price.fr,
      priceAr: input.price.ar,
      periodFr: input.period.fr,
      periodAr: input.period.ar,
      ctaFr: input.cta.fr,
      ctaAr: input.cta.ar,
      badgeFr: input.badge.fr || null,
      badgeAr: input.badge.ar || null,
      featuresFr: toJson(input.features.fr),
      featuresAr: toJson(input.features.ar),
    },
    create: {
      key: input.key,
      active: input.active,
      highlighted: input.highlighted,
      sortOrder: input.sortOrder,
      leadType: input.leadType,
      nameFr: input.name.fr,
      nameAr: input.name.ar,
      priceFr: input.price.fr,
      priceAr: input.price.ar,
      periodFr: input.period.fr,
      periodAr: input.period.ar,
      ctaFr: input.cta.fr,
      ctaAr: input.cta.ar,
      badgeFr: input.badge.fr || null,
      badgeAr: input.badge.ar || null,
      featuresFr: toJson(input.features.fr),
      featuresAr: toJson(input.features.ar),
    },
  });
  return mapPricingPlanRow(row);
}

export async function deletePricingPlanDb(key: string): Promise<void> {
  await prisma.orm.public.PricingPlan.where({ key }).delete();
}

/**
 * Renumbers keys in steps of 10 (10, 20, 30...) to avoid sort ties and ensure clean ordering.
 */
export async function reorderPricingPlansDb(keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const sortOrder = (i + 1) * 10;
    await prisma.orm.public.PricingPlan.where({ key }).update({ sortOrder });
  }
}
