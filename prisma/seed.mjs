import { db } from "../src/prisma/db.ts";
import { toInstant } from "../src/prisma/codecs.ts";
import { cities } from "../lib/data/cities.ts";
import { specialties } from "../lib/data/specialties.ts";
import { clinics } from "../lib/data/clinics.ts";
import { blogPosts } from "../lib/data/blog.ts";

async function main() {
  console.log("🌱 Starting Dental Discovery database seed...");

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
        googlePlaceId: clinic.googlePlaceId,
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
        googlePlaceId: clinic.googlePlaceId,
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
