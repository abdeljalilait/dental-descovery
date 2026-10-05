"use server";

import { revalidatePath } from "next/cache";
import { locales } from "@/lib/i18n/config";
import { requireAdmin } from "@/lib/admin/auth";
import {
  deletePricingPlanDb,
  reorderPricingPlansDb,
  upsertPricingPlanDb,
} from "@/lib/repositories/pricing";
import type { LeadType, PricingPlanInput } from "@/lib/data/types";
import { isLeadType } from "@/lib/data/types";

function revalidatePricing(): void {
  for (const locale of locales) {
    revalidatePath(`/${locale}/tarifs`);
    revalidatePath(`/${locale}`);
  }
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/pricing");
}

function parseFeatures(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export interface PricingPlanFormState {
  error?: string;
  saved?: boolean;
}

export async function savePricingPlanAction(
  _prev: PricingPlanFormState,
  formData: FormData
): Promise<PricingPlanFormState> {
  await requireAdmin();

  const key = text(formData, "key");
  if (!key) {
    return { error: "A unique plan key is required (e.g. solo, standard)." };
  }

  const nameFr = text(formData, "nameFr");
  const nameAr = text(formData, "nameAr");
  if (!nameFr || !nameAr) {
    return { error: "French and Arabic plan names are required." };
  }

  const rawLeadType = text(formData, "leadType");
  const leadType: LeadType = isLeadType(rawLeadType) ? rawLeadType : "app-demo";

  const rawSortOrder = parseInt(text(formData, "sortOrder"), 10);
  const sortOrder = Number.isFinite(rawSortOrder) ? rawSortOrder : 0;

  const active = formData.get("active") === "on" || formData.get("active") === "true";
  const highlighted =
    formData.get("highlighted") === "on" || formData.get("highlighted") === "true";

  const input: PricingPlanInput = {
    key,
    active,
    highlighted,
    sortOrder,
    leadType,
    name: { fr: nameFr, ar: nameAr },
    price: {
      fr: text(formData, "priceFr") || "Sur devis",
      ar: text(formData, "priceAr") || "حسب الطلب",
    },
    period: {
      fr: text(formData, "periodFr") || "/ mois",
      ar: text(formData, "periodAr") || "شهرياً",
    },
    cta: {
      fr: text(formData, "ctaFr") || "Choisir",
      ar: text(formData, "ctaAr") || "اختيار",
    },
    badge: {
      fr: text(formData, "badgeFr") || null,
      ar: text(formData, "badgeAr") || null,
    },
    features: {
      fr: parseFeatures(text(formData, "featuresFr")),
      ar: parseFeatures(text(formData, "featuresAr")),
    },
  };

  try {
    await upsertPricingPlanDb(input);
    revalidatePricing();
    return { saved: true };
  } catch (error) {
    console.error("Failed to save pricing plan:", error);
    return { error: error instanceof Error ? error.message : "Failed to save pricing plan" };
  }
}

export async function deletePricingPlanAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const key = text(formData, "key");
  if (!key) return;

  await deletePricingPlanDb(key);
  revalidatePricing();
}

export async function reorderPricingPlansAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const rawKeys = text(formData, "keys");
  if (!rawKeys) return;

  try {
    const keys: string[] = JSON.parse(rawKeys);
    if (Array.isArray(keys) && keys.length > 0) {
      await reorderPricingPlansDb(keys);
      revalidatePricing();
    }
  } catch (e) {
    console.error("Invalid keys payload in reorderPricingPlansAction:", e);
  }
}
