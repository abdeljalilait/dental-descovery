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

  sections.push(`# ${siteConfig.name} — Documentation Complète pour Modèles de Langage (LLMs)

> Documentation exhaustive de la plateforme ${siteConfig.name} (${base}), incluant l'annuaire médical des chirurgiens-dentistes au Maroc et la suite logicielle SaaS Dental-App pour praticiens.

## 1. Vue d'Ensemble du Projet

${siteConfig.name} est un écosystème numérique dentaire bilingue (Français et Arabe marocain) conçu spécifiquement pour le marché marocain, articulé autour de deux axes :
1. **B2C (Grand Public & Patients)** : Faciliter la recherche et la prise de contact avec des chirurgiens-dentistes et centres dentaires qualifiés dans toutes les grandes villes du Maroc, avec des guides pédagogiques et des repères tarifaires transparents.
2. **B2B (Praticiens & Équipes Dentaires)** : Fournir une suite logicielle SaaS moderne (Dental-App) pour digitaliser la gestion de cabinet (agenda multi-fauteuils, rappels automatiques WhatsApp, dossier médical et odontogramme 3D, copilot clinique IA sécurisé), ainsi que des sites internet médicaux clé en main.

### Métriques Clés en Direct (Base de Données)
- **Villes couvertes** : ${stats.cityCount}+ grandes agglomérations marocaines
- **Cabinets dentaires répertoriés** : ${stats.clinicCount}+ établissements
- **Spécialités représentées** : ${stats.specialtyCount} disciplines dentaires
- **Note moyenne des praticiens** : ${stats.averageRating.toFixed(1)}/5 (${stats.reviewCount.toLocaleString("fr-FR")}+ avis vérifiés)`);

  if (cities.length > 0) {
    const cityItems = cities
      .map(
        (c) =>
          `### ${c.name} (${c.region.fr})\n- URL : ${base}${cityPath("fr", c.slug)}\n- Description : Annuaire des chirurgiens-dentistes et spécialistes à ${c.name}.`
      )
      .join("\n\n");
    sections.push(`## 2. Villes Marocaines Couvertes (${cities.length} agglomérations)\n\n${cityItems}`);
  }

  if (specialties.length > 0) {
    const specialtyItems = specialties
      .map(
        (s) =>
          `### ${s.name.fr}\n- URL : ${base}${treatmentPath("fr", s.slug)}\n- Description : ${s.description.fr}`
      )
      .join("\n\n");
    sections.push(`## 3. Spécialités & Traitements Dentaires (${specialties.length} disciplines)\n\n${specialtyItems}`);
  }

  sections.push(`## 4. Dental-App — Suite Logicielle SaaS pour Cabinets Dentaires

Dental-App (${base}${localizedPath("app", "fr")}) est une solution logicielle cloud hautement disponible, accessible depuis tout navigateur (ordinateur, tablette, mobile) sans installation matérielle lourde :
- **Agenda intelligent multi-fauteuils** : Synchronisation en temps réel des plannings par fauteuil et praticien, codes couleur par acte, gestion des urgences et des créneaux libres.
- **Rappels automatiques WhatsApp** : Envoi de messages de confirmation et de rappel 24h avant la consultation via l'API officielle WhatsApp Business. Réduction mesurée de 65% à 70% de l'absentéisme (no-shows).
- **Odontogramme 3D & Dossier Patient** : Cartographie dentaire interactive, historique clinique, plans de traitement chiffrés et exportables en PDF, suivi des radios et consentements éclairés.
- **Copilot Clinique IA** : Assistant clinique d'aide à la gestion respectueux du secret médical, résumés de briefings matinaux, détection proactive de devis en attente de relance et optimisation de l'occupation des fauteuils.
- **Tableau de bord financier & Analytics** : Suivi du chiffre d'affaires, taux d'occupation, actes les plus rentables, gestion des règlements et reste à charge mutuelle (CNSS / CNOPS).`);

  if (plans.length > 0) {
    const planItems = plans
      .map((p) => {
        const featList = p.features.fr.map((f) => `  - ${f}`).join("\n");
        return `### Formule ${p.name.fr}\n- **Tarif** : ${p.price.fr} ${p.period.fr}${p.badge.fr ? ` (${p.badge.fr})` : ""}\n- **Fonctionnalités incluses** :\n${featList}`;
      })
      .join("\n\n");
    sections.push(`## 5. Grille Tarifaire & Abonnements (Base de Données)\n\n- **Frais de mise en place / installation** : 4 000 MAD par cabinet (paramétrage, formation de l'équipe et synchronisation WhatsApp).\n\n${planItems}\n\nPage des tarifs et simulateur ROI : ${base}${localizedPath("pricing", "fr")}`);
  }

  if (posts.length > 0) {
    const postItems = posts
      .map(
        (p) =>
          `### ${p.title.fr}\n- URL : ${base}${blogPostPath("fr", p.slug)}\n- Catégorie : ${p.category.fr}\n- Date : ${p.date} (${p.readTime} min de lecture)\n- Résumé : ${p.excerpt.fr}`
      )
      .join("\n\n");
    sections.push(`## 6. Articles Éducatifs & Guides de Santé Bucco-Dentaire (${posts.length} articles)\n\n${postItems}`);
  }

  sections.push(`## 7. Création de Sites Web Dentaires Sur-Mesure

Dentora conçoit également des sites web médicaux modernes pour les praticiens (${base}${localizedPath("website", "fr")}) :
- Conformité totale avec la déontologie médicale
- Optimisation pour le référencement local Google Maps
- Module de prise de rendez-vous ou demande de devis intégré
- Vitrine esthétique valorisant le plateau technique du cabinet`);

  sections.push(`## 8. Contact & Support Technique

- Email : ${siteConfig.email}
- Téléphone : ${siteConfig.phone}
- Formulaire en ligne : ${base}${localizedPath("contact", "fr")}`);

  const content = sections.join("\n\n") + "\n";

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
