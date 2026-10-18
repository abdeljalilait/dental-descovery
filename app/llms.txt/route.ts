import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site.config";
import { getCitiesDb } from "@/lib/repositories/cities";
import { getSpecialtiesDb } from "@/lib/repositories/specialties";
import { getBlogArticlesDb } from "@/lib/repositories/blog";
import { getDirectoryStatsDb } from "@/lib/repositories/stats";
import { getActivePricingPlansDb } from "@/lib/repositories/pricing";
import { cityPath, treatmentPath, blogPostPath, localizedPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = siteConfig.url.replace(/\/$/, "");

  const [cities, specialties, posts, stats, plans] = await Promise.all([
    getCitiesDb(),
    getSpecialtiesDb(),
    getBlogArticlesDb(),
    getDirectoryStatsDb(),
    getActivePricingPlansDb(),
  ]);

  const sections: string[] = [];

  sections.push(`# ${siteConfig.name}

> Plateforme médicale de référence et suite logicielle SaaS (Dental-App) pour les chirurgiens-dentistes et centres dentaires au Maroc.

${siteConfig.name} (${base}) est une plateforme bilingue (français et arabe marocain) qui connecte les patients aux cabinets dentaires certifiés à travers le Maroc, tout en fournissant aux praticiens des outils numériques avancés : logiciel de gestion de cabinet avec copilot IA clinique, prise de rendez-vous en ligne, rappels automatiques WhatsApp, et création de sites internet dentaires sur-mesure.`);

  sections.push(`## Annuaire & Services Patients

- [Dentistes au Maroc](${base}${localizedPath("dentists", "fr")}): Annuaire national des chirurgiens-dentistes et centres dentaires géolocalisés avec avis vérifiés et horaires d'ouverture (${stats.clinicCount}+ cabinets référencés).
- [Guides des Traitements Dentaires](${base}${localizedPath("treatments", "fr")}): Informations complètes sur les soins dentaires et repères tarifaires au Maroc (${specialties.length} spécialités traitées).
- [Blog & Conseils de Santé Dentaire](${base}${localizedPath("blog", "fr")}): Guides de santé bucco-dentaire rédigés pour le contexte marocain (${posts.length} articles disponibles).`);

  if (cities.length > 0) {
    const cityLines = cities
      .map(
        (c) =>
          `- [Dentistes à ${c.name}](${base}${cityPath("fr", c.slug)}): Cabinets et chirurgiens-dentistes à ${c.name} (${c.region.fr}).`
      )
      .join("\n");
    sections.push(`## Villes Couvertes (${cities.length} villes au Maroc)\n\n${cityLines}`);
  }

  if (specialties.length > 0) {
    const specialtyLines = specialties
      .map(
        (s) =>
          `- [${s.name.fr}](${base}${treatmentPath("fr", s.slug)}): ${s.description.fr}`
      )
      .join("\n");
    sections.push(`## Spécialités Dentaires & Traitements\n\n${specialtyLines}`);
  }

  if (posts.length > 0) {
    const postLines = posts
      .slice(0, 10)
      .map(
        (p) =>
          `- [${p.title.fr}](${base}${blogPostPath("fr", p.slug)}): ${p.excerpt.fr}`
      )
      .join("\n");
    sections.push(`## Articles Récents du Blog Dentaire\n\n${postLines}`);
  }

  const pricingSummary =
    plans.length > 0
      ? ` (${plans.map((p) => `${p.name.fr} à ${p.price.fr}${p.period.fr}`).join(", ")})`
      : "";

  sections.push(`## Solutions pour Cabinets Dentaires (B2B)

- [Dental-App — Logiciel SaaS Dentaire](${base}${localizedPath("app", "fr")}): Suite tout-en-un de gestion de cabinet : agenda intelligent multi-fauteuils, rappels automatiques WhatsApp, odontogramme 3D interactif et copilot clinique IA sécurisé.
- [Création de Sites Web Dentaires](${base}${localizedPath("website", "fr")}): Conception de sites web médicaux modernes et responsives, optimisés pour Google Maps et le référencement local.
- [Espace Praticiens & Revendication](${base}${localizedPath("forClinics", "fr")}): Portail permettant aux praticiens de revendiquer leur profil de cabinet, mettre à jour leurs équipements, horaires et certifications.
- [Tarifs & Offres](${base}${localizedPath("pricing", "fr")}): Tarification transparente des abonnements Dental-App${pricingSummary} et simulateur de rentabilité financière (ROI).`);

  sections.push(`## Contact & Assistance

- [Contact & Démonstration](${base}${localizedPath("contact", "fr")}): Contacter l'équipe Dentora pour planifier une démo personnalisée ou obtenir un accompagnement.`);

  sections.push(`## Documentation Détaillée

- [llms-full.txt](${base}/llms-full.txt): Contexte complet incluant la description détaillée des modules Dental-App, des spécialités médicales et de l'ensemble des articles.`);

  const content = sections.join("\n\n") + "\n";

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
