import type { Metadata } from "next";
import { listPricingPlansDb } from "@/lib/repositories/pricing";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PricingPlansEditor } from "@/components/admin/pricing-plan-form";

export const metadata: Metadata = { title: "Pricing Plans" };

export default async function AdminPricingPage() {
  const plans = await listPricingPlansDb();

  return (
    <>
      <AdminPageHeader
        title="Pricing Plans"
        description="Configure subscription tiers, monthly rates, WhatsApp quotas, feature lists, and featured cards across /tarifs and the landing page."
      />
      <PricingPlansEditor plans={plans} />
    </>
  );
}
