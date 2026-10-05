import { db } from "../src/prisma/db.ts";
import { toInstant } from "../src/prisma/codecs.ts";
import { cities } from "../lib/data/cities.ts";
import { specialties } from "../lib/data/specialties.ts";
import { clinics } from "../lib/data/clinics.ts";
import { blogPosts } from "../lib/data/blog.ts";

async function main() {
  console.log("🌱 Starting Dentora database seed...");

  // 1. Seed Cities
  console.log(`Inserting ${cities.length} cities...`);
  for (const city of cities) {
    await db.orm.public.City.upsert({
      conflictOn: { slug: city.slug },
      update: {
        name: city.name,
        nameAr: city.nameAr,
        regionFr: city.region.fr,
        regionAr: city.region.ar,
        lat: city.lat,
        lng: city.lng,
        populationFr: city.populationNote.fr,
        populationAr: city.populationNote.ar,
        seoIntroFr: city.seoIntro.fr,
        seoIntroAr: city.seoIntro.ar,
        featured: city.featured,
      },
      create: {
        slug: city.slug,
        name: city.name,
        nameAr: city.nameAr,
        regionFr: city.region.fr,
        regionAr: city.region.ar,
        lat: city.lat,
        lng: city.lng,
        populationFr: city.populationNote.fr,
        populationAr: city.populationNote.ar,
        seoIntroFr: city.seoIntro.fr,
        seoIntroAr: city.seoIntro.ar,
        featured: city.featured,
      },
    });
  }

  // 2. Seed Specialties
  console.log(`Inserting ${specialties.length} specialties...`);
  for (const specialty of specialties) {
    await db.orm.public.Specialty.upsert({
      conflictOn: { slug: specialty.slug },
      update: {
        nameFr: specialty.name.fr,
        nameAr: specialty.name.ar,
        descriptionFr: specialty.description.fr,
        descriptionAr: specialty.description.ar,
        icon: specialty.icon,
      },
      create: {
        slug: specialty.slug,
        nameFr: specialty.name.fr,
        nameAr: specialty.name.ar,
        descriptionFr: specialty.description.fr,
        descriptionAr: specialty.description.ar,
        icon: specialty.icon,
      },
    });
  }

  // 3. Seed Clinics & Relations
  console.log(`Inserting ${clinics.length} clinics...`);
  for (const clinic of clinics) {
    // `lastSyncedAt` is a timestamptz on the temporal codec, which rejects a
    // JavaScript `Date` and encodes `Temporal.Instant` instead.
    const lastSyncedAt = toInstant(clinic.lastSyncedAt || new Date().toISOString());

    const upsertedClinic = await db.orm.public.Clinic.upsert({
      conflictOn: { slug: clinic.slug },
      update: {
        // Most seed rows have no Google place id. Writing null over a row that a
        // sync has already enriched with a real one would discard it, so a null
        // seed value leaves the existing column untouched.
        ...(clinic.googlePlaceId ? { googlePlaceId: clinic.googlePlaceId } : {}),
        name: clinic.name,
        nameAr: clinic.nameAr,
        citySlug: clinic.citySlug,
        neighborhoodFr: clinic.neighborhood.fr,
        neighborhoodAr: clinic.neighborhood.ar,
        addressFr: clinic.address.fr,
        addressAr: clinic.address.ar,
        phone: clinic.phone,
        phoneHref: clinic.phoneHref,
        whatsapp: clinic.whatsapp,
        website: clinic.website,
        rating: clinic.rating,
        reviewCount: clinic.reviewCount,
        verified: clinic.verified,
        claimed: clinic.claimed,
        usesApp: clinic.usesApp,
        descriptionFr: clinic.description.fr,
        descriptionAr: clinic.description.ar,
        lat: clinic.lat,
        lng: clinic.lng,
        hours: clinic.hours,
        lastSyncedAt,
      },
      create: {
        slug: clinic.slug,
        googlePlaceId: clinic.googlePlaceId ?? null,
        name: clinic.name,
        nameAr: clinic.nameAr,
        citySlug: clinic.citySlug,
        neighborhoodFr: clinic.neighborhood.fr,
        neighborhoodAr: clinic.neighborhood.ar,
        addressFr: clinic.address.fr,
        addressAr: clinic.address.ar,
        phone: clinic.phone,
        phoneHref: clinic.phoneHref,
        whatsapp: clinic.whatsapp,
        website: clinic.website,
        rating: clinic.rating,
        reviewCount: clinic.reviewCount,
        verified: clinic.verified,
        claimed: clinic.claimed,
        usesApp: clinic.usesApp,
        descriptionFr: clinic.description.fr,
        descriptionAr: clinic.description.ar,
        lat: clinic.lat,
        lng: clinic.lng,
        hours: clinic.hours,
        lastSyncedAt,
      },
    });

    // Associate specialties
    for (const specSlug of clinic.specialtySlugs) {
      const spec = await db.orm.public.Specialty.where({ slug: specSlug }).first();
      if (spec) {
        await db.orm.public.ClinicSpecialty.upsert({
          conflictOn: {
            clinicId: upsertedClinic.id,
            specialtyId: spec.id,
          },
          update: {},
          create: {
            clinicId: upsertedClinic.id,
            specialtyId: spec.id,
          },
        });
      }
    }
  }


  // 4. Seed Blog Posts
  // Published from the start: these are the launch articles that were previously
  // served from the static seed file, so the blog must not go empty. `publishedAt`
  // is a timestamptz on the temporal codec, hence `toInstant` rather than a Date.
  console.log(`Inserting ${blogPosts.length} blog posts...`);
  for (const post of blogPosts) {
    await db.orm.public.BlogPost.upsert({
      conflictOn: { slug: post.slug },
      update: {},
      create: {
        slug: post.slug,
        titleFr: post.title.fr,
        titleAr: post.title.ar,
        excerptFr: post.excerpt.fr,
        excerptAr: post.excerpt.ar,
        contentFr: post.content.fr,
        contentAr: post.content.ar,
        categoryFr: post.category.fr,
        categoryAr: post.category.ar,
        readTime: post.readTime,
        coverImageUrl: null,
        relatedCitySlug: post.relatedCitySlug,
        relatedSpecialtySlug: post.relatedSpecialtySlug,
        status: "PUBLISHED",
        publishedAt: toInstant(post.date),
      },
    });
  }

  // 5. Seed Pricing Plans (Dental App subscription tiers)
  // Insert-only: upsert with update: {} ensures re-seeding never clobbers operator edits.
  const pricingPlans = [
    {
      key: "solo",
      active: true,
      highlighted: false,
      sortOrder: 10,
      leadType: "app-demo",
      nameFr: "Solo",
      nameAr: "سولو",
      priceFr: "599 MAD",
      priceAr: "599 درهم",
      periodFr: "/ mois",
      periodAr: "شهرياً",
      ctaFr: "Choisir Solo",
      ctaAr: "اختر سولو",
      badgeFr: null,
      badgeAr: null,
      featuresFr: [
        "1 Médecin",
        "1 Assistante",
        "10 msg WhatsApp / jour",
        "Application dentaire Cloud",
        "Hébergement serveur & domaine",
        "Sauvegardes & support technique",
      ],
      featuresAr: [
        "طبيب واحد",
        "مساعدة واحدة",
        "10 رسائل واتساب / يوم",
        "تطبيق سحابي للعيادة",
        "استضافة واسم نطاق",
        "نسخ احتياطي ودعم فني",
      ],
    },
    {
      key: "standard",
      active: true,
      highlighted: false,
      sortOrder: 20,
      leadType: "app-demo",
      nameFr: "Standard",
      nameAr: "ستاندارد",
      priceFr: "699 MAD",
      priceAr: "699 درهم",
      periodFr: "/ mois",
      periodAr: "شهرياً",
      ctaFr: "Choisir Standard",
      ctaAr: "اختر ستاندارد",
      badgeFr: null,
      badgeAr: null,
      featuresFr: [
        "1 Médecin",
        "2 Assistantes",
        "20 msg WhatsApp / jour",
        "Application dentaire Cloud",
        "Hébergement serveur & domaine",
        "Sauvegardes & support technique",
      ],
      featuresAr: [
        "طبيب واحد",
        "مساعدتان",
        "20 رسالة واتساب / يوم",
        "تطبيق سحابي للعيادة",
        "استضافة واسم نطاق",
        "نسخ احتياطي ودعم فني",
      ],
    },
    {
      key: "cabinet-plus",
      active: true,
      highlighted: true,
      sortOrder: 30,
      leadType: "app-demo",
      nameFr: "Cabinet +",
      nameAr: "عيادة +",
      priceFr: "899 MAD",
      priceAr: "899 درهم",
      periodFr: "/ mois",
      periodAr: "شهرياً",
      ctaFr: "Choisir Cabinet +",
      ctaAr: "اختر عيادة +",
      badgeFr: "Recommandé",
      badgeAr: "موصى به",
      featuresFr: [
        "2 Médecins",
        "3 Assistantes",
        "30 msg WhatsApp / jour",
        "Application dentaire Cloud",
        "Hébergement serveur & domaine",
        "Sauvegardes & support technique",
      ],
      featuresAr: [
        "طبيبان",
        "3 مساعدات",
        "30 رسالة واتساب / يوم",
        "تطبيق سحابي للعيادة",
        "استضافة واسم نطاق",
        "نسخ احتياطي ودعم فني",
      ],
    },
    {
      key: "premium",
      active: true,
      highlighted: false,
      sortOrder: 40,
      leadType: "app-demo",
      nameFr: "Premium",
      nameAr: "بريميوم",
      priceFr: "1 199 MAD",
      priceAr: "1 199 درهم",
      periodFr: "/ mois",
      periodAr: "شهرياً",
      ctaFr: "Choisir Premium",
      ctaAr: "اختر بريميوم",
      badgeFr: null,
      badgeAr: null,
      featuresFr: [
        "3 Médecins",
        "5 Assistantes",
        "50 msg WhatsApp / jour",
        "Application dentaire Cloud",
        "Hébergement serveur & domaine",
        "Support prioritaire & sauvegardes",
      ],
      featuresAr: [
        "3 أطباء",
        "5 مساعدات",
        "50 رسالة واتساب / يوم",
        "تطبيق سحابي للعيادة",
        "استضافة واسم نطاق",
        "دعم ذو أولوية ونسخ احتياطي",
      ],
    },
    {
      key: "sur-mesure",
      active: true,
      highlighted: false,
      sortOrder: 50,
      leadType: "app-demo",
      nameFr: "Sur mesure",
      nameAr: "حسب الطلب",
      priceFr: "À définir",
      priceAr: "حسب الطلب",
      periodFr: "selon vos besoins",
      periodAr: "حسب احتياج العيادة",
      ctaFr: "Nous contacter",
      ctaAr: "تواصل معنا",
      badgeFr: null,
      badgeAr: null,
      featuresFr: [
        "4+ Médecins",
        "6+ Assistantes",
        "50+ msg WhatsApp / jour",
        "Architecture multi-cabinets",
        "Intégrations sur mesure",
        "Accompagnement & gestionnaire dédié",
      ],
      featuresAr: [
        "4+ أطباء",
        "6+ مساعدات",
        "50+ رسالة واتساب / يوم",
        "بنية متعددة العيادات",
        "ربط وتكامل مخصص",
        "مرافقة ومدير حساب مخصص",
      ],
    },
  ];

  console.log(`Inserting ${pricingPlans.length} pricing plans...`);
  for (const plan of pricingPlans) {
    await db.orm.public.PricingPlan.upsert({
      conflictOn: { key: plan.key },
      update: {},
      create: {
        key: plan.key,
        active: plan.active,
        highlighted: plan.highlighted,
        sortOrder: plan.sortOrder,
        leadType: plan.leadType,
        nameFr: plan.nameFr,
        nameAr: plan.nameAr,
        priceFr: plan.priceFr,
        priceAr: plan.priceAr,
        periodFr: plan.periodFr,
        periodAr: plan.periodAr,
        ctaFr: plan.ctaFr,
        ctaAr: plan.ctaAr,
        badgeFr: plan.badgeFr,
        badgeAr: plan.badgeAr,
        featuresFr: plan.featuresFr,
        featuresAr: plan.featuresAr,
      },
    });
  }

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
