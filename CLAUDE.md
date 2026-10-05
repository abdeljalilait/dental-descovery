# CLAUDE.md - Dentora Project Guide

@AGENTS.md

## Project Overview

**Dentora** (`dentora.ma`) is a bilingual medical portal and B2B SaaS platform for the Moroccan dental market.
- **B2C (Patients)**: Find clinics and dentists across Moroccan cities, view ratings and specialties, and book appointments.
- **B2B (Practices)**: "Dental App" SaaS (AI copilot, 3D odontogram, agenda, WhatsApp automation), custom clinic websites, listing claims, and an ROI calculator.

---

## Key Tech Stack & Conventions

- **Next.js 16.3.4 (App Router)** & **React 19.2.8**
- **Next.js 16 Request Proxy**: Uses [`proxy.ts`](proxy.ts) instead of `middleware.ts`. Never rename it to `middleware.ts`.
- **Async Route Parameters**: All `params` and `searchParams` in App Router components (`page.tsx`, `layout.tsx`) are Promises (`params: Promise<{ ... }>`). Always `await params`.
- **Tailwind CSS v4**: Theme tokens are declared in [`app/globals.css`](app/globals.css) via `@theme`. There is no `tailwind.config.js`.
- **Headless UI**: Accessible dialogs, tabs, accordions, tooltips, dropdowns via `@radix-ui/react-*` components wrapped in [`components/ui/`](components/ui/).
- **Icons**: `lucide-react`.

---

## Internationalization (i18n) & RTL

- Supported locales: `fr` (French, default, LTR) and `ar` (Arabic, RTL).
- Font family: `Manrope` for French, `Noto Sans Arabic` for Arabic.
- Translations: Located in [`lib/i18n/dictionaries/fr.json`](lib/i18n/dictionaries/fr.json) and [`lib/i18n/dictionaries/ar.json`](lib/i18n/dictionaries/ar.json).
- **Rule**: Whenever adding or modifying UI strings, always update **both** `fr.json` and `ar.json`.
- **Routing**: Always use helpers in [`lib/routes.ts`](lib/routes.ts) (`localizedPath`, `cityPath`, `clinicPath`, etc.) rather than hardcoding paths.

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

# Container image for registry.hakiware.com (typecheck + lint + docker build)
make all
make push

# Jobs are NOT scheduled: start them from /admin/jobs, or use the CLI
npm run sync:clinics -- --city=casablanca
npm run sync:clinics -- --dry-run
```

---

## Database Architecture (Prisma ORM 8 & PostgreSQL)

- **Version & Modules**: Prisma 8 with `@prisma/orm-postgres`.
- **Configuration**: [`prisma.config.ts`](prisma.config.ts) (`definePrismaConfig` from `prisma/config` + `@prisma/orm-postgres/config`).
- **Contract / Schema**: [`prisma/schema.prisma`](prisma/schema.prisma) (datasource URLs managed centrally via `prisma.config.ts`).
- **Client**: [`lib/prisma.ts`](lib/prisma.ts).
- **Repository Layer**: [`lib/repositories/clinics.ts`](lib/repositories/clinics.ts) handles DB queries with fallback to static seed files when offline.
- **Lead Persistence**: [`app/api/leads/route.ts`](app/api/leads/route.ts) saves inquiries directly to the `Lead` model.

---

## Content Management & Dynamic SEO (PostgreSQL + `/admin`)

- **Repository**: `lib/repositories/blog.ts` reads published articles from the `blog_posts` table (no fallback; `lib/data/blog.ts` only seeds it) and exposes admin mutations.
- **Dynamic SEO Builder**: `lib/seo/page-seo.ts` applies `page_seos` overrides (`metaTitle`, `metaDescription`, `ogImage`, `canonicalUrl`, `robots`) into Next.js `generateMetadata()`, field by field, each falling back to the page default.
- **Admin UI & Auth**: `app/admin/` (guarded by `app/admin/(protected)/layout.tsx`); single-operator password plus an HMAC-signed httpOnly cookie from `lib/admin/auth.ts`. Save actions revalidate paths directly, so there is no revalidation webhook.
- **Strapi is gone**: there is no CMS dependency, no `STRAPI_URL`/`STRAPI_API_TOKEN` env vars, and no `app/api/revalidate` route.

---

## Admin-Triggered Jobs (No Scheduler)

- **No Bree, no cron**: `jobs/` is gone and there is no worker process. Both heavy
  jobs start from [`app/admin/(protected)/jobs/page.tsx`](app/admin/(protected)/jobs/page.tsx)
  via `app/admin/jobs-actions.ts`, which returns immediately and runs the work in
  Next.js `after()`.
- **Progress lives in PostgreSQL**: `job_runs` rows are written by
  `lib/repositories/job-runs.ts` and polled by `app/api/admin/jobs/[id]/route.ts`.
  Runs abandoned by a deploy are reaped after 30 minutes so a dead run cannot block
  the next one.
- **WhatsApp campaign**: [`lib/services/campaign-sender.ts`](lib/services/campaign-sender.ts)
  (`sendCampaign`) sends approved templates through Kapso. `SENT` means WhatsApp
  accepted the message; `DELIVERED`/`READ` come from
  [`app/api/webhooks/kapso/route.ts`](app/api/webhooks/kapso/route.ts), which matches
  `clinic_outreach.providerMessageId` and fails closed without
  `KAPSO_WEBHOOK_SECRET`.
- **SerpApi sync**: `runClinicSync` in [`lib/services/clinic-sync.ts`](lib/services/clinic-sync.ts), capped per run by
  `SERPAPI_MAX_SEARCHES` because each search spends one of 250 monthly credits
  (a full sweep costs 15 searches).
- **Deployment**: multi-stage [`Dockerfile`](Dockerfile), built with `make all` and
  pushed to `registry.hakiware.com` with `make push`.

## Architecture & Codebase Map

- [`app/[lang]/`](app/[lang]/): Bilingual routes
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
- [`app/api/leads/route.ts`](app/api/leads/route.ts): API route handling lead submissions (demos, claims, quotes, contact).
- [`components/ui/`](components/ui/): Radix UI wrappers (`accordion.tsx`, `dialog.tsx`, `tabs.tsx`, `tooltip.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `button.tsx`, `badges.tsx`, `rating.tsx`).
- [`components/landing/`](components/landing/): [`interactive-app-studio.tsx`](components/landing/interactive-app-studio.tsx), [`clinic-roi-calculator.tsx`](components/landing/clinic-roi-calculator.tsx), hero, claim, stats, and feature sections.
- [`lib/data/`](lib/data/): Strongly typed data seed files (`clinics.ts`, `cities.ts`, `specialties.ts`, `blog.ts`, `types.ts`).
- [`lib/seo/schema.ts`](lib/seo/schema.ts): JSON-LD Structured Data builders (`Dentist`, `LocalBusiness`, `FAQPage`, `BreadcrumbList`, `Article`).
- [`e2e/`](e2e/): Playwright test specifications.

---

## Coding Standards & Rules

1. **RTL Support**: Use logical spacing classes (`ms-*`, `me-*`, `start-*`, `end-*`) or ensure components render seamlessly in both LTR and RTL.
2. **Type Safety**: Strictly type models using [`lib/data/types.ts`](lib/data/types.ts).
3. **SEO**: Include structured data graphs on new public pages using [`components/seo/structured-data.tsx`](components/seo/structured-data.tsx) and helpers from [`lib/seo/schema.ts`](lib/seo/schema.ts).
4. **Preserve Comments & Docs**: Do not strip existing documentation or configuration comments.
