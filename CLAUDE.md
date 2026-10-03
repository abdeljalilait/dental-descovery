# CLAUDE.md - Dental Discovery Project Guide

@AGENTS.md

## Project Overview

**Dental Discovery** (`dental-discovery.ma`) is a bilingual medical portal and B2B SaaS platform for the Moroccan dental market.
- **B2C (Patients)**: Find clinics and dentists across Moroccan cities, view ratings and specialties, and book appointments.
- **B2B (Practices)**: "Dental App" SaaS (AI copilot, 3D odontogram, agenda, WhatsApp automation), custom clinic websites, listing claims, and an ROI calculator.

---

## Key Tech Stack & Conventions

- **Next.js 16.3.4 (App Router)** & **React 19.2.8**
- **Next.js 16 Request Proxy**: Uses [`proxy.ts`](file:///Users/abdeljalil/projects/dental-descovery/proxy.ts) instead of `middleware.ts`. Never rename it to `middleware.ts`.
- **Async Route Parameters**: All `params` and `searchParams` in App Router components (`page.tsx`, `layout.tsx`) are Promises (`params: Promise<{ ... }>`). Always `await params`.
- **Tailwind CSS v4**: Theme tokens are declared in [`app/globals.css`](file:///Users/abdeljalil/projects/dental-descovery/app/globals.css) via `@theme`. There is no `tailwind.config.js`.
- **Headless UI**: Accessible dialogs, tabs, accordions, tooltips, dropdowns via `@radix-ui/react-*` components wrapped in [`components/ui/`](file:///Users/abdeljalil/projects/dental-descovery/components/ui/).
- **Icons**: `lucide-react`.

---

## Internationalization (i18n) & RTL

- Supported locales: `fr` (French, default, LTR) and `ar` (Arabic, RTL).
- Font family: `Manrope` for French, `Noto Sans Arabic` for Arabic.
- Translations: Located in [`lib/i18n/dictionaries/fr.json`](file:///Users/abdeljalil/projects/dental-descovery/lib/i18n/dictionaries/fr.json) and [`lib/i18n/dictionaries/ar.json`](file:///Users/abdeljalil/projects/dental-descovery/lib/i18n/dictionaries/ar.json).
- **Rule**: Whenever adding or modifying UI strings, always update **both** `fr.json` and `ar.json`.
- **Routing**: Always use helpers in [`lib/routes.ts`](file:///Users/abdeljalil/projects/dental-descovery/lib/routes.ts) (`localizedPath`, `cityPath`, `clinicPath`, etc.) rather than hardcoding paths.

---

## Common Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Run production build
npm run build

# Start production server
npm run start

# Run ESLint checks
npm run lint

# Run Playwright E2E tests
npx playwright test

# Run Playwright E2E tests with UI
npx playwright test --ui

# Run a specific Playwright test file
npx playwright test e2e/bilingual-rtl.spec.ts

# Run SerpApi Google Maps sync job (free tier: 250/mo quota)
npm run sync:clinics
npm run sync:clinics -- --city=casablanca
npm run sync:clinics -- --dry-run

# Database operations with Prisma
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema changes to PostgreSQL
npm run db:seed        # Seed PostgreSQL with Moroccan cities, specialties, and clinics

# Run background job scheduler (Bree.js worker)
npm run worker
```

---

## Database Architecture (Prisma ORM 8 & PostgreSQL)

- **Version & Modules**: Prisma 8 with `@prisma/orm-postgres`.
- **Configuration**: [`prisma.config.ts`](file:///Users/abdeljalil/projects/dental-descovery/prisma.config.ts) (`definePrismaConfig` from `prisma/config` + `@prisma/orm-postgres/config`).
- **Contract / Schema**: [`prisma/schema.prisma`](file:///Users/abdeljalil/projects/dental-descovery/prisma/schema.prisma) (datasource URLs managed centrally via `prisma.config.ts`).
- **Client**: [`lib/prisma.ts`](file:///Users/abdeljalil/projects/dental-descovery/lib/prisma.ts).
- **Repository Layer**: [`lib/repositories/clinics.ts`](file:///Users/abdeljalil/projects/dental-descovery/lib/repositories/clinics.ts) handles DB queries with fallback to static seed files when offline.
- **Lead Persistence**: [`app/api/leads/route.ts`](file:///Users/abdeljalil/projects/dental-descovery/app/api/leads/route.ts) saves inquiries directly to the `Lead` model.

---

## Content Management & Dynamic SEO (PostgreSQL + `/admin`)

- **Repository**: `lib/repositories/blog.ts` reads published articles from the `blog_posts` table (no fallback; `lib/data/blog.ts` only seeds it) and exposes admin mutations.
- **Dynamic SEO Builder**: `lib/seo/page-seo.ts` applies `page_seos` overrides (`metaTitle`, `metaDescription`, `ogImage`, `canonicalUrl`, `robots`) into Next.js `generateMetadata()`, field by field, each falling back to the page default.
- **Admin UI & Auth**: `app/admin/` (guarded by `app/admin/(protected)/layout.tsx`); single-operator password plus an HMAC-signed httpOnly cookie from `lib/admin/auth.ts`. Save actions revalidate paths directly, so there is no revalidation webhook.
- **Strapi is gone**: there is no CMS dependency, no `STRAPI_URL`/`STRAPI_API_TOKEN` env vars, and no `app/api/revalidate` route.

---

## Background Jobs & Scheduler (Bree.js & SerpApi)

- **Bree.js Scheduler**: [`jobs/index.mjs`](file:///Users/abdeljalil/projects/dental-descovery/jobs/index.mjs) (`npm run worker`) executes scheduled tasks using isolated Node.js worker threads without system cron dependencies.
- **Worker Script**: [`jobs/sync-clinics.mjs`](file:///Users/abdeljalil/projects/dental-descovery/jobs/sync-clinics.mjs) runs the weekly SerpApi Google Maps sync job.
- **PM2 Setup**: [`ecosystem.config.cjs`](file:///Users/abdeljalil/projects/dental-descovery/ecosystem.config.cjs) runs both the Next.js website and the Bree worker in parallel.
- **Route Handler**: [`app/api/cron/sync-clinics/route.ts`](file:///Users/abdeljalil/projects/dental-descovery/app/api/cron/sync-clinics/route.ts) for on-demand HTTP triggers.
- **SerpApi Free Tier Budget (250/mo, 50/hr)**:
  - 10 Moroccan cities in [`lib/data/cities.ts`](file:///Users/abdeljalil/projects/dental-descovery/lib/data/cities.ts).
  - 1 complete national run uses **10 search credits**.
  - Default schedule: weekly (`0 3 * * 0` = 40 searches/month, well within the 250 limit).
  - Built-in 1.5s delay between requests prevents exceeding the 50/hour rate limit.

---

## Architecture & Codebase Map

- [`app/[lang]/`](file:///Users/abdeljalil/projects/dental-descovery/app/[lang]/): Bilingual routes
  - `page.tsx`: Home / Landing page
  - `layout.tsx`: Root HTML layout with font setup and direction (`dir="ltr"` / `dir="rtl"`)
  - `dentistes/`: Directory national view, city view `[city]`, and clinic view `[city]/[clinic]`
  - `dental-app/`: B2B SaaS landing page with interactive studio simulator
  - `pour-les-cliniques/`: Clinic claim & ROI calculator
  - `site-web-dentaire/`: Custom clinic website showcase
  - `tarifs/`: Pricing plans
  - `traitements/`: Guides by treatment type (`[slug]`)
  - `blog/`: Dental advice articles (`[slug]`)
  - `contact/`: Contact page
- [`app/api/leads/route.ts`](file:///Users/abdeljalil/projects/dental-descovery/app/api/leads/route.ts): API route handling lead submissions (demos, claims, quotes, contact).
- [`components/ui/`](file:///Users/abdeljalil/projects/dental-descovery/components/ui/): Radix UI wrappers (`accordion.tsx`, `dialog.tsx`, `tabs.tsx`, `tooltip.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `button.tsx`, `badges.tsx`, `rating.tsx`).
- [`components/landing/`](file:///Users/abdeljalil/projects/dental-descovery/components/landing/): [`interactive-app-studio.tsx`](file:///Users/abdeljalil/projects/dental-descovery/components/landing/interactive-app-studio.tsx), [`clinic-roi-calculator.tsx`](file:///Users/abdeljalil/projects/dental-descovery/components/landing/clinic-roi-calculator.tsx), hero, claim, stats, and feature sections.
- [`lib/data/`](file:///Users/abdeljalil/projects/dental-descovery/lib/data/): Strongly typed data seed files (`clinics.ts`, `cities.ts`, `specialties.ts`, `blog.ts`, `types.ts`).
- [`lib/seo/schema.ts`](file:///Users/abdeljalil/projects/dental-descovery/lib/seo/schema.ts): JSON-LD Structured Data builders (`Dentist`, `LocalBusiness`, `FAQPage`, `BreadcrumbList`, `Article`).
- [`e2e/`](file:///Users/abdeljalil/projects/dental-descovery/e2e/): Playwright test specifications.

---

## Coding Standards & Rules

1. **RTL Support**: Use logical spacing classes (`ms-*`, `me-*`, `start-*`, `end-*`) or ensure components render seamlessly in both LTR and RTL.
2. **Type Safety**: Strictly type models using [`lib/data/types.ts`](file:///Users/abdeljalil/projects/dental-descovery/lib/data/types.ts).
3. **SEO**: Include structured data graphs on new public pages using [`components/seo/structured-data.tsx`](file:///Users/abdeljalil/projects/dental-descovery/components/seo/structured-data.tsx) and helpers from [`lib/seo/schema.ts`](file:///Users/abdeljalil/projects/dental-descovery/lib/seo/schema.ts).
4. **Preserve Comments & Docs**: Do not strip existing documentation or configuration comments.
