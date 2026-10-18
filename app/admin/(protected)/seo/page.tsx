import type { Metadata } from "next";
import { listPageSeosDb } from "@/lib/repositories/blog";
import { PageSeoEditor } from "@/components/admin/page-seo-editor";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getCitiesDb } from "@/lib/repositories/cities";
import { citySeoRouteKey } from "@/lib/seo/page-seo-routes";

export const metadata: Metadata = { title: "Page SEO" };

export default async function AdminSeoPage() {
  const [records, cities] = await Promise.all([listPageSeosDb(), getCitiesDb()]);

  return (
    <>
      <AdminPageHeader
        title="Page SEO"
        description="Overrides for a page's title, description and social image. Any field left empty falls back to the page's own metadata, so a partial override only replaces what it sets."
      />

      <PageSeoEditor records={records} cityRoutes={cities.map((city) => ({ key: citySeoRouteKey(city.slug), label: `Dentists in ${city.name}` }))} />
    </>
  );
}
