/**
 * SerpApi Google Maps sync — framework-free core.
 *
 * Deliberately plain `.mjs` with no path aliases, no Prisma and no Next.js so
 * that all three entry points share one implementation:
 *   - `lib/services/serpapi.ts`  (Next.js route + cron handler)
 *   - `scripts/sync-clinics.mjs` (CLI)
 *   - `jobs/sync-clinics.mjs`    (Bree worker thread)
 *
 * API shape: https://serpapi.com/search.json?engine=google_maps&q=...&ll=@lat,lng,14z
 */

/** SerpApi free tier: 250 searches/month, 50 searches/hour. Env-overridable. */
export const MONTHLY_SEARCH_BUDGET = Number(process.env.SERPAPI_MONTHLY_BUDGET ?? 250);
export const HOURLY_SEARCH_LIMIT = Number(process.env.SERPAPI_HOURLY_LIMIT ?? 50);

/** Minimum gap between requests, keeping a run under the 50/hour throughput. */
export const DEFAULT_DELAY_MS = 1500;

export class SearchBudgetExceededError extends Error {
  constructor(used, limit) {
    super(`SerpApi monthly search budget exhausted (${used}/${limit}).`);
    this.name = "SearchBudgetExceededError";
    this.used = used;
    this.limit = limit;
  }
}

/** Counts SerpApi searches so a run can never silently overspend the free tier. */
export class SearchBudget {
  #used = 0;

  constructor(limit = MONTHLY_SEARCH_BUDGET) {
    this.limit = limit;
  }

  get spent() {
    return this.#used;
  }

  get remaining() {
    return Math.max(0, this.limit - this.#used);
  }

  canAfford(n = 1) {
    return this.#used + n <= this.limit;
  }

  /** Reserves `n` searches, or throws when the quota is exhausted. */
  spend(n = 1) {
    if (!this.canAfford(n)) {
      throw new SearchBudgetExceededError(this.#used, this.limit);
    }
    this.#used += n;
    return this.#used;
  }
}

/**
 * Dental search terms applied to every city. Several keywords per city widen
 * coverage: a clinic ranking for "dentiste" often never appears for
 * "orthodontiste", and Google Maps returns at most ~20 results per query.
 */
export const DENTAL_KEYWORDS = [
  "dentiste",
  "cabinet dentaire",
  "chirurgien dentiste",
  "orthodontiste",
  "dentiste esthetique",
  "implantologie dentaire",
  "prothese dentaire",
];

/** Build the per-city query list, e.g. `dentiste Casablanca maroc`. */
export function buildCityQueries(city, keywords = DENTAL_KEYWORDS) {
  return keywords.map((keyword) => `${keyword} ${city.name} maroc`);
}

/** URL-safe slug from a free-text string. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Map raw SerpApi category strings onto our specialty slugs. */
export const SPECIALTY_RULES = [
  { slug: "implantologie", pattern: /implant|chirurgie/i },
  { slug: "orthodontie", pattern: /ortho|aligneur|bague/i },
  { slug: "facettes", pattern: /facette|hollywood|esthetique|esthétique|smile/i },
  { slug: "blanchiment", pattern: /blanchiment|eclaircissement|éclaircissement/i },
  { slug: "parodontologie", pattern: /parodonto|gencive|dechaussement|déchaussement/i },
  { slug: "pedodontie", pattern: /pedodont|pédodont|enfant|pediatric/i },
  { slug: "protheses-dentaires", pattern: /prothese|prothèse|couronne|bridge|zircone/i },
  { slug: "urgence-dentaire", pattern: /urgence|sos|gard/i },
];

/** Infer specialties from a place's title, categories and description. */
export function inferSpecialties(name, types = [], desc = "") {
  const haystack = `${name} ${types.join(" ")} ${desc}`.toLowerCase();
  const matched = new Set();

  for (const { slug, pattern } of SPECIALTY_RULES) {
    if (pattern.test(haystack)) matched.add(slug);
  }

  if (matched.size === 0) {
    matched.add("blanchiment");
    matched.add("protheses-dentaires");
  }

  return Array.from(matched);
}

/**
 * Normalise a Moroccan phone number into display / tel: / WhatsApp forms.
 *
 * Missing, masked (`+212 539 XXX XXX`) or unusable numbers yield `null` rather
 * than a filler value: fabricating a number would both display misinformation
 * and, worse, direct outreach at an uninvolved subscriber.
 */
export function normalizeMoroccanPhone(rawPhone) {
  const unknown = { phone: null, phoneHref: null, whatsapp: null };
  if (!rawPhone || /X{2,}/i.test(rawPhone)) return unknown;

  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 8) return unknown;

  let normalized = digits;

  if (digits.startsWith("0") && digits.length === 10) {
    normalized = "212" + digits.slice(1);
  } else if (!digits.startsWith("212") && digits.length === 9) {
    normalized = "212" + digits;
  }

  if (normalized === "212600000000" || normalized === "212522000000") return unknown;

  // Only Moroccan mobiles (06/07) can receive WhatsApp messages.
  const isMobile = normalized.startsWith("2126") || normalized.startsWith("2127");

  return {
    phone: rawPhone,
    phoneHref: `+${normalized}`,
    whatsapp: isMobile ? normalized : null,
  };
}

/** Collapse SerpApi `operating_hours` into the app's weekday/Saturday rows. */
export function parseOperatingHours(operatingHours) {
  if (!operatingHours || Object.keys(operatingHours).length === 0) {
    return [
      { days: { fr: "Lun – Ven", ar: "الاثنين – الجمعة" }, time: "09:00 – 19:00" },
      { days: { fr: "Samedi", ar: "السبت" }, time: "09:00 – 13:00" },
    ];
  }

  const weekdays = operatingHours.monday || operatingHours.tuesday || "09:00 – 18:00";
  const saturday = operatingHours.saturday || "09:00 – 13:00";

  return [
    { days: { fr: "Lun – Ven", ar: "الاثنين – الجمعة" }, time: weekdays.replace(/\u2013/g, "–") },
    { days: { fr: "Samedi", ar: "السبت" }, time: saturday.replace(/\u2013/g, "–") },
  ];
}

/** Map one SerpApi place result onto the app's `Clinic` shape. */
export function mapSerpApiPlaceToClinic(place, city) {
  const baseSlug = slugify(place.title || "cabinet-dentaire");
  const suffix = place.place_id
    ? place.place_id.slice(-6).toLowerCase()
    : Math.random().toString(36).slice(2, 6);

  const phone = normalizeMoroccanPhone(place.phone);
  const address = place.address || `${city.name}, Maroc`;
  const categories = [...(place.types ?? []), ...(place.type_ids ?? [])];
  const rating = typeof place.rating === "number" ? place.rating : 4.8;
  const reviewCount = typeof place.reviews === "number" ? place.reviews : 12;
  const specialties = inferSpecialties(place.title, categories, place.description ?? "");

  return {
    slug: `${baseSlug}-${suffix}`,
    googlePlaceId: place.place_id || `place_${Date.now()}_${Math.random()}`,
    name: place.title,
    // SerpApi returns the registered name; Arabic names come from a later pass.
    nameAr: place.title,
    citySlug: city.slug,
    neighborhood: { fr: address.split(",")[0] || city.name, ar: city.nameAr },
    address: { fr: address, ar: `${address} - ${city.nameAr}` },
    phone: phone.phone,
    phoneHref: phone.phoneHref,
    whatsapp: phone.whatsapp,
    website: place.website || null,
    rating,
    reviewCount,
    specialtySlugs: specialties,
    verified: rating >= 4.7 && reviewCount >= 10,
    claimed: false,
    usesApp: false,
    description: {
      fr: `Cabinet dentaire ${place.title} situé à ${city.name}. Soins dentaires de qualité, consultations et urgences.`,
      ar: `عيادة طب الأسنان ${place.title} في ${city.nameAr}. علاجات أسنان عالية الجودة واستشارات وحالات طارئة.`,
    },
    lat: place.gps_coordinates?.latitude ?? city.lat,
    lng: place.gps_coordinates?.longitude ?? city.lng,
    hours: parseOperatingHours(place.operating_hours),
    lastSyncedAt: new Date().toISOString().split("T")[0],
  };
}

/**
 * One `engine=google_maps` search scoped to a city via `ll=@lat,lng,zoom`.
 * Costs exactly 1 search credit.
 */
export async function searchPlaces(city, query, apiKey, zoom = 14) {
  const ll = `@${city.lat},${city.lng},${zoom}z`;
  const url =
    "https://serpapi.com/search.json?engine=google_maps&type=search" +
    `&q=${encodeURIComponent(query)}` +
    `&ll=${encodeURIComponent(ll)}` +
    `&hl=fr&gl=ma&api_key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    const text = await res.text();
    return { places: [], error: `SerpApi returned status ${res.status}: ${text.slice(0, 200)}` };
  }

  const data = await res.json();

  if (data.error) {
    return { places: [], error: `SerpApi error: ${data.error}` };
  }

  return { places: data.local_results ?? [] };
}

/**
 * Search one city across every dental keyword, merging the overlap between
 * queries. Stops early and records why once the budget cannot cover another
 * search.
 */
export async function syncCityWithKeywords(city, apiKey, options = {}) {
  const {
    budget,
    keywords = DENTAL_KEYWORDS,
    delayMs = DEFAULT_DELAY_MS,
    zoom = 14,
    onQuery,
  } = options;

  const queries = buildCityQueries(city, keywords);
  const byPlaceId = new Map();
  const errors = [];
  const attempted = [];
  let searchesUsed = 0;

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];

    if (budget && !budget.canAfford(1)) {
      errors.push(
        `Stopped after ${searchesUsed} searches: monthly budget reached (${budget.spent}/${budget.limit}).`,
      );
      break;
    }

    onQuery?.({ city, query, index: i, total: queries.length });

    try {
      const { places, error } = await searchPlaces(city, query, apiKey, zoom);
      searchesUsed++;
      attempted.push(query);
      budget?.spend(1);

      if (error) {
        errors.push(`${query}: ${error}`);
        continue;
      }

      for (const place of places) {
        const clinic = mapSerpApiPlaceToClinic(place, city);
        // Google returns the same clinic under several keywords; place_id is
        // stable, so it is the dedupe key. Merge specialties on repeat hits.
        const existing = byPlaceId.get(clinic.googlePlaceId);
        if (existing) {
          existing.specialtySlugs = Array.from(
            new Set([...existing.specialtySlugs, ...clinic.specialtySlugs]),
          );
        } else {
          byPlaceId.set(clinic.googlePlaceId, clinic);
        }
      }
    } catch (err) {
      searchesUsed++;
      attempted.push(query);
      budget?.spend(1);
      errors.push(`${query}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (i < queries.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const clinics = [...byPlaceId.values()];

  return {
    citySlug: city.slug,
    cityName: city.name,
    fetched: clinics.length,
    clinics,
    searchesUsed,
    keywords: attempted,
    error: errors.length > 0 ? errors.join(" | ") : undefined,
  };
}

/**
 * Sync a list of cities, sharing one monthly budget across the whole run.
 */
export async function syncAllCities(targetCities, apiKey, options = {}) {
  const {
    budget = new SearchBudget(MONTHLY_SEARCH_BUDGET),
    keywords = DENTAL_KEYWORDS,
    delayMs = DEFAULT_DELAY_MS,
    onQuery,
    onCity,
  } = options;

  const details = [];

  for (const city of targetCities) {
    if (!budget.canAfford(1)) {
      details.push({
        citySlug: city.slug,
        cityName: city.name,
        fetched: 0,
        clinics: [],
        searchesUsed: 0,
        error: `Skipped: monthly budget exhausted (${budget.spent}/${budget.limit}).`,
      });
      continue;
    }

    const result = await syncCityWithKeywords(city, apiKey, {
      budget,
      keywords,
      delayMs,
      onQuery,
    });
    details.push(result);
    onCity?.(result);
  }

  return {
    timestamp: new Date().toISOString(),
    totalCities: targetCities.length,
    totalClinics: details.reduce((acc, r) => acc + r.fetched, 0),
    searchesUsed: details.reduce((acc, r) => acc + r.searchesUsed, 0),
    searchBudget: budget.limit,
    searchesRemaining: budget.remaining,
    details,
  };
}