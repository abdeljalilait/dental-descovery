import type { Metadata } from "next";
import Link from "next/link";
import { getCitiesDb } from "@/lib/repositories/cities";
import { getSpecialtiesDb } from "@/lib/repositories/specialties";
import { ArticleForm } from "@/components/admin/article-form";
import { AdminPageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticlePage() {
  const [cities, specialties] = await Promise.all([getCitiesDb(), getSpecialtiesDb()]);

  return (
    <>
      <AdminPageHeader
        title="New article"
        description="One record holds both languages. Saving as a draft keeps it out of the listings and the sitemap until you publish."
      />

      <ArticleForm
        cities={cities.map((city) => ({ slug: city.slug, name: city.name, nameAr: city.nameAr }))}
        specialties={specialties.map((specialty) => ({
          slug: specialty.slug,
          name: specialty.name,
        }))}
      />

      <p className="mt-6 text-xs text-muted">
        Prefer an existing slug?{" "}
        <Link href="/admin/articles" className="underline hover:text-primary">
          Cancel and go back
        </Link>
        .
      </p>
    </>
  );
}