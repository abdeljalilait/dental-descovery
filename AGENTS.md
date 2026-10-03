<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Dental Discovery Developer & Agent Guidelines

## 1. Project Overview & Architecture

**Dental Discovery** (`dental-discovery.ma`) is a bilingual (French & Moroccan Arabic) medical platform and SaaS ecosystem catering to two primary audiences:
- **B2C Patients**: Discover vetted dental clinics, dental specialties, pricing guides, and request appointments across major Moroccan cities.
- **B2B Clinics & Dentists**: "Dental App" SaaS practice management software (AI copilot, 3D odontogram, agenda, automated WhatsApp reminders, analytics), turnkey dental website development, and clinic profile claim & verification.

### Core Stack
- **Framework**: Next.js 16 (App Router)
- **Runtime / UI**: React 19, TypeScript 5
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`, configured via `@theme` in `app/globals.css`)
- **UI Primitives**: Radix UI (`@radix-ui/react-dialog`, `react-tabs`, `react-accordion`, `react-tooltip`, `react-dropdown-menu`, `react-popover`)
- **Icons**: `lucide-react`
- **Testing**: Playwright (`e2e/`)
- **i18n**: French (`fr`, default) and Arabic (`ar`, RTL) with `@formatjs/intl-localematcher` & `negotiator`

---

## 2. Next.js 16 Critical Conventions & Breaking Changes

1. **`proxy.ts` Replaces `middleware.ts`**:
   - Next.js 16 replaces `middleware.ts` with `proxy.ts` at the root of the project.
   - Do **NOT** rename `proxy.ts` to `middleware.ts`.
   - The export must be named `proxy` (e.g. `export function proxy(request: NextRequest)`).
   - Matchers are defined in `export const config = { matcher: [...] }`.

2. **Asynchronous Route Parameters (`params` & `searchParams`)**:
   - In Next.js 16, `params` and `searchParams` in `page.tsx` and `layout.tsx` are Promises.
   - Always type them as `Promise<{ ... }>` and await them:
     ```tsx
     export default async function Page({
       params,
     }: {
       params: Promise<{ lang: string; city?: string }>;
     }) {
       const { lang, city } = await params;
       // ...
     }
     ```

3. **Preserve Next.js Agent Block**:
   - Keep the `<!-- BEGIN:nextjs-agent-rules -->` ... `<!-- END:nextjs-agent-rules -->` block intact at the top of this file to prevent `next dev` from auto-generating uncommitted diffs.

---

## 3. Internationalization (i18n) & RTL Rules

- Supported locales are defined in `lib/i18n/config.ts`: `["fr", "ar"]`, with default `fr`.
- Layout direction must match the active locale:
  - `fr`: `dir="ltr"`, font family `Manrope` (`--font-manrope`).
  - `ar`: `dir="rtl"`, font family `Noto Sans Arabic` (`--font-noto-arabic`).
- Dynamic routing lives under `app/[lang]/`.
- Dictionaries are stored in `lib/i18n/dictionaries/fr.json` and `lib/i18n/dictionaries/ar.json`.
- **Always update both dictionary files** whenever adding, changing, or removing UI copy.
- Always use `lib/routes.ts` helpers (`localizedPath`, `cityPath`, `clinicPath`, `treatmentPath`, `blogPostPath`) instead of hardcoding URL paths.

---

## 4. Design System & Styling Conventions

- **Tailwind CSS v4**: Tokens and themes are declared in `app/globals.css` using the `@theme` directive (there is no `tailwind.config.js`).
- **Color Tokens**:
  - `primary`: `#0c3652` (deep dental blue)
  - `primary-dark`: `#072134`
  - `accent`: `#059669` (clinical emerald green)
  - `champagne` / `gold`: `#d97706` (verified badges & premium accents)
  - `surface`: `#ffffff`, `surface-subtle`: `#f1f5f9`, `background`: `#f8fafc`
- **Component Patterns**:
  - Reusable layout & UI containers: `Container`, `Section`, `ButtonLink`, `Rating`, `Badges`.
  - Accessible interactive modals & drawers powered by Radix UI.
  - Utility classes merged using `cn()` from `lib/utils/cn.ts`.

---

## 5. Directory Structure & Key Files

```
├── app/
│   ├── [lang]/
│   │   ├── page.tsx                      # Landing page with interactive showcases & ROI calculator
│   │   ├── layout.tsx                    # Root HTML layout (fonts, i18n dir, header/footer)
│   │   ├── dentistes/                    # Directory: national, city [city], and clinic profile
│   │   ├── dental-app/                   # B2B dental practice management software landing
│   │   ├── site-web-dentaire/            # Custom dental website development offering
│   │   ├── pour-les-cliniques/           # Clinic listing claims & B2B portal
│   │   ├── tarifs/                       # Pricing plans & ROI calculator
│   │   ├── traitements/                  # Patient treatment guides ([slug])
│   │   ├── blog/                         # Patient education & SEO articles ([slug])
│   │   └── contact/                      # Contact page
│   ├── api/
│   │   └── leads/route.ts                # Lead capture API endpoint
│   ├── sitemap.ts & robots.ts            # Dynamic bilingual XML sitemap & robots directives
│   └── globals.css                       # Tailwind v4 theme definitions and keyframes
├── components/
│   ├── clinic/                           # Lead forms, lead modals, clinic details
│   ├── directory/                        # Clinic card, city card, directory search bar
│   ├── landing/                          # InteractiveAppStudio, ClinicRoiCalculator, Hero, etc.
│   ├── layout/                           # Header, Footer, MobileCtaBar, LanguageSwitcher, Logo
│   ├── seo/                              # StructuredData component (JSON-LD)
│   └── ui/                               # Radix UI wrappers (accordion, dialog, tabs, tooltip, popover)
├── lib/
│   ├── data/                             # Seed datasets (clinics.ts, cities.ts, specialties.ts, blog.ts)
│   ├── i18n/                             # i18n config, loader, and JSON dictionaries
│   ├── routes.ts                         # Centralized route helper functions
│   ├── seo/schema.ts                     # Schema.org JSON-LD graph generators
│   └── site.config.ts                    # Global metadata, contact details, domain settings
├── proxy.ts                              # Next.js 16 request proxy & locale negotiation
└── e2e/                                  # Playwright end-to-end tests
```

---

## 6. Development & Operational Commands

```bash
# Start development server on http://localhost:3000
npm run dev

# Run TypeScript build
npm run build

# Start production server
npm run start

# Run ESLint validation
npm run lint

# Run Playwright E2E test suite
npx playwright test

# Run Playwright in UI mode
npx playwright test --ui

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

## 7. Database (Prisma ORM 8 & PostgreSQL)

- **Prisma Version**: Prisma 8 (modular architecture with `@prisma/orm-postgres`).
- **Configuration**: `prisma.config.ts` using `definePrismaConfig` from `prisma/config` and `@prisma/orm-postgres/config`.
- **Contract / Schema**: `prisma/schema.prisma` (datasource URLs managed centrally via `prisma.config.ts`).
- **Models**: `City`, `Specialty`, `Clinic`, `ClinicSpecialty`, `Lead`, `ClinicClaim`.
- **Client Singleton**: `lib/prisma.ts` with connection caching.
- **Repository Pattern & Resilience**: `lib/repositories/clinics.ts` queries Prisma when `DATABASE_URL` is set, with seamless fallback to static seed data if offline or during local development.
- **Lead Persistence**: `app/api/leads/route.ts` saves leads to Prisma `Lead` table.

---

## 8. Content Management & Dynamic SEO (PostgreSQL + `/admin`)

Strapi has been removed. Articles and page-level SEO live in PostgreSQL and are edited through a
protected admin UI. There is no external CMS and no fallback: `lib/data/blog.ts` exists only to
seed `blog_posts` via `prisma/seed.mjs`.

- **Contract Models**: `prisma/contract.prisma` defines `BlogPost` (with `*Fr`/`*Ar` column pairs
  plus nullable SEO overrides) and `PageSeo` (unique on `routeKey` + `locale`).
- **Repository**: `lib/repositories/blog.ts`
  - Public reads (`getBlogArticlesDb`, `getBlogArticleBySlugDb`, `getBlogArticlesBySpecialtyDb`)
    return **published rows only**.
  - Admin mutations (`createBlogPostDb`, `updateBlogPostDb`, `setBlogPostStatusDb`,
    `deleteBlogPostDb`, `upsertPageSeoDb`, `deletePageSeoDb`).
  - `publishedAt` is a `timestamptz` on the temporal codec: writes take `toInstant()` from
    `src/prisma/codecs.ts`, reads go through `String(...)`.
- **Dynamic SEO Builder**: `lib/seo/page-seo.ts` injects `page_seos` overrides into
  `generateMetadata()`. Every field is nullable and falls back to the page default.
- **Admin UI**: `app/admin/` — server components plus server actions in `app/admin/actions.ts`.
  The guard lives in `app/admin/(protected)/layout.tsx`; `app/admin/login/` sits outside that
  group so it stays reachable.
- **Authentication**: `lib/admin/auth.ts` — single-operator password (`ADMIN_PASSWORD`) with an
  HMAC-SHA256-signed httpOnly cookie. `proxy.ts` exempts `/admin` from the locale redirect.
- **Revalidation**: no webhook. Admin actions run in the same Next.js process and call
  `revalidatePath` directly, so `app/api/revalidate` no longer exists.
- **Schema changes**: `npm run db:push` (which is `prisma db update`).

---

## 9. Background Jobs & Scheduler (Bree.js & SerpApi)

- **Bree.js Scheduler**: `jobs/index.mjs` manages background jobs via Node.js worker threads (no system crontab needed).
- **Worker Job**: `jobs/sync-clinics.mjs` runs SerpApi sync in an isolated worker thread.
- **PM2 Orchestration**: `ecosystem.config.cjs` manages Next.js (`dental-discovery-web`) and Bree (`dental-discovery-worker`).
- **Free Tier Budget Guidelines**:
  - SerpApi free tier provides **250 searches / month** and **50 throughput / hour**.
  - Morocco has 10 target cities (`tanger`, `casablanca`, `rabat`, `marrakech`, `fes`, `agadir`, `oujda`, `kenitra`, `tetouan`, `safi`).
  - 1 sync run across all 10 cities consumes **10 searches** (~200 clinic results).
  - Configurable schedule via `SYNC_CRON_SCHEDULE` env var (default: `0 3 * * 0` weekly, 40 searches/month).
  - Built-in 1.5s delay between requests prevents exceeding the 50/hour rate limit.
  - Automatically upserts synced clinics into PostgreSQL via Prisma.

---

## 10. Guidelines for Agents & Contributors

- **Preserve Documentation Integrity**: Do not delete existing comments or documentation unless explicitly requested.
- **RTL Awareness**: When implementing UI components, test both LTR (`fr`) and RTL (`ar`). Use logical margin/padding utilities (e.g. `ms-*`, `me-*`, `start-*`, `end-*`) or ensure proper bidirectional styling.
- **Structured Data**: Keep JSON-LD schemas in `lib/seo/schema.ts` up to date with any data model changes.
- **Type Safety**: Strictly adhere to types in `lib/data/types.ts` (`Clinic`, `City`, `Specialty`, `BlogPost`, `LeadPayload`).
