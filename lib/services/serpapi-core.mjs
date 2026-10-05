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

/** Maximum pages to follow via serpapi_pagination per query (each page consumes 1 credit). */
export const DEFAULT_MAX_PAGES = Number(process.env.SERPAPI_MAX_PAGES ?? 3);

/**
 * Google Maps `ll` zoom used for every city sweep.
 *
 * 14z frames only the city centroid, which truncates the metro area of the big
 * cities — Casablanca and Rabat hold far more clinics than fit in one frame.
 * 13z widens the radius for free: the credit cost per search is unchanged.
 */
export const DEFAULT_ZOOM = Number(process.env.SERPAPI_ZOOM ?? 13);

/**
 * Reject results that drifted outside the city while zooming out.
 *
 * The city of a result is taken from the sweep, not from the place itself, so a
 * wider radius would otherwise file a neighbouring city's clinic under the wrong
 * city. Anything beyond this distance from the centroid is dropped instead.
 */
export const MAX_CITY_RADIUS_KM = Number(process.env.SERPAPI_MAX_CITY_RADIUS_KM ?? 35);

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
 * Dental search terms applied to every city, grouped by what they are good for.
 *
 * Several keywords per city widen coverage: a clinic ranking for "dentiste"
 * often never appears for "orthodontiste", and Google Maps returns at most ~20
 * results per query. The `generic` group overlaps heavily with itself — those
 * credits are worth spending only on a single city. The `specialty` and
 * `gapfill` groups are what actually reach clinics the generic terms miss.
 *
 * The `english` group is not redundant with the French terms. English is the
 * second language of most Moroccan dental signage and of a large share of Google
 * Business Profiles, so a clinic can rank for "dental clinic" and be absent from
 * every French result page. It is worth a sweep of its own, and cheap next to
 * finding those profiles at all.
 *
 * Note the cost: each term is one search credit per city, so a full sweep over
 * all 15 cities costs `DENTAL_KEYWORDS.length * 15`. The admin picker shows that
 * estimate live and a run stops itself at `MONTHLY_SEARCH_BUDGET`, so the
 * catalogue is deliberately kept to terms that each reach a different slice.
 */
export const DENTAL_KEYWORD_GROUPS = [
  {
    id: "generic",
    label: "Generic",
    hl: "fr",
    hint: "Broad coverage, but these overlap heavily with each other.",
    keywords: [
      "dentiste",
      "centre dentaire",
      "clinique dentaire",
      "cabinet dentaire",
      "chirurgien dentiste",
      "soins dentaires",
    ],
  },
  {
    id: "specialty",
    label: "Specialty",
    hl: "fr",
    hint: "Reaches clinics the generic terms rank below the fold.",
    keywords: [
      "orthodontiste",
      "dentiste esthetique",
      "implantologie",
      "prothese dentaire",
      "parodontiste",
      "dentiste enfant",
      "maladie des gencives",
      "cabinet orthodontie",
    ],
  },
  {
    id: "english",
    label: "English",
    hl: "en",
    hint: "Expat-facing and English-signed clinics that the French terms miss.",
    keywords: [
      "dentist",
      "dental clinica",
      "dental center",
      "dental surgery",
      "cosmetic dentist",
      "dental implants",
      "invisalign",
      "root canal",
      "teeth whitening",
      "oral surgeon",
      "pediatric dentist",
      "dental care",
    ],
  },
  {
    id: "gapfill",
    label: "Urgent & niche",
    hl: "fr",
    hint: "Small sets that no other term picks up.",
    keywords: ["dentiste SOS", "dentiste garde", "dentiste nuit", "dentiste anglais"],
  },
  {
    id: "spanish",
    label: "Spanish",
    hl: "es",
    hint: "Clinicas that list themselves in Spanish rather than French or English.",
    keywords: ["clinica dental", "clinica dentistica", "clinica odontologica"],
  },
];

/** Every keyword, flattened. Kept flat for the existing importers. */
export const DENTAL_KEYWORDS = DENTAL_KEYWORD_GROUPS.flatMap((group) => group.keywords);

/**
 * Google interface language to request per keyword.
 *
 * SerpApi's `hl` biases which profiles Google ranks, not just the UI language.
 * Asking for `dental clinic` under `hl=fr` returns largely the same clinics as
 * `dentiste`, because the French-language weighting wins over the English query
 * terms, which defeats the point of the group. Each group therefore carries the
 * `hl` its terms are written in.
 */
export const KEYWORD_LANGUAGE = new Map(
  DENTAL_KEYWORD_GROUPS.flatMap((group) => group.keywords.map((keyword) => [keyword, group.hl])),
);

/** Resolves the `hl` for a single query string, defaulting to French. */
export function languageForQuery(query) {
  const keyword = String(query ?? "").trim().toLowerCase();
  // Match the longest catalogue term so "dentiste SOS" wins over "dentiste".
  const match = [...KEYWORD_LANGUAGE.keys()]
    .filter((candidate) => keyword === candidate || keyword.startsWith(`${candidate} `))
    .sort((a, b) => b.length - a.length)[0];
  return (match && KEYWORD_LANGUAGE.get(match)) || "fr";
}

/** Primary keyword for low-quota single-search sweeps across cities. */
export const PRIMARY_DENTAL_KEYWORDS = ["dentiste"];

/**
 * The catalogue as a lookup, so the admin form and the server action can validate
 * a selection against the known terms instead of trusting free-form input.
 */
export const DENTAL_KEYWORD_LABELS = DENTAL_KEYWORD_GROUPS.flatMap((group) =>
  group.keywords.map((keyword) => ({ keyword, groupId: group.id, groupLabel: group.label })),
);

/**
 * Keep only catalogue terms, in catalogue order and without duplicates.
 *
 * This is the single gate every operator-supplied keyword list passes through:
 * form input and CLI flags alike end up interpolated into a billable search
 * query, so an arbitrary string must never reach `buildCityQueries`.
 */
export function sanitizeKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  const picked = new Set(
    keywords.map((keyword) => String(keyword ?? "").trim().toLowerCase()).filter(Boolean),
  );
  // Matched case-insensitively but returned in the catalogue's own spelling.
  // Folding the input while comparing against the mixed-case catalogue silently
  // dropped every keyword with an uppercase letter in it, "dentiste SOS" among
  // them, so those chips could never be selected from the form or the CLI.
  return DENTAL_KEYWORDS.filter((keyword) => picked.has(keyword.toLowerCase()));
}

/**
 * Free SerpApi account check (costs 0 search credits).
 * Returns live remaining quota and monthly usage if the key is valid.
 */
export async function getSerpApiAccountInfo(apiKey) {
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const searchesPerMonth = Number(data.searches_per_month ?? 250);
    const thisMonthUsage = Number(data.this_month_usage ?? 0);
    const calculatedRemaining = Math.max(0, searchesPerMonth - thisMonthUsage);

    const rawLeft =
      data.total_searches_left ??
      data.searches_remaining ??
      data.plan_searches_left ??
      calculatedRemaining;

    const totalSearchesLeft = Number(rawLeft);

    return {
      searchesPerMonth,
      thisMonthUsage,
      totalSearchesLeft: Number.isNaN(totalSearchesLeft) ? calculatedRemaining : totalSearchesLeft,
      planName: data.plan_name ?? "Free Tier",
    };
  } catch {
    return null;
  }
}

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

/**
 * Small non-cryptographic hash (FNV-1a) rendered as 8 hex chars.
 *
 * Only used to derive a stable identity from a place that Google returned without
 * an id, so it needs to be deterministic across runs and processes rather than
 * collision-resistant.
 */
export function stableHash(input) {
  let hash = 0x811c9dc5;
  const text = String(input);
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in range with Math.imul.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Stable identity for one place across every sync run.
 *
 * `place_id` is Google's own key and is what we want whenever it is present.
 * Some responses only carry `data_id`, which is equally stable, so it is accepted
 * next. When neither is available the identity is derived from name, city and
 * address instead — deliberately never a random value, because a fresh random id
 * on every run defeats the `googlePlaceId` unique constraint and inserts the same
 * clinic again each time.
 */
export function resolvePlaceId(place, city) {
  if (place?.place_id) return String(place.place_id);
  if (place?.data_id) return String(place.data_id);

  const name = slugify(place?.title || "");
  const address = slugify(place?.address || "");
  const citySlug = city?.slug || "unknown";
  return `syn_${stableHash(`${name}|${citySlug}|${address}`)}`;
}

/** Great-circle distance in km between two coordinates. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Whether a result sits close enough to the city to be filed under it.
 *
 * A place with no coordinates is kept: we cannot prove it drifted, and dropping
 * it would lose a real clinic over missing data.
 */
export function isWithinCityRadius(place, city, maxKm = MAX_CITY_RADIUS_KM) {
  const lat = place?.gps_coordinates?.latitude;
  const lng = place?.gps_coordinates?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return true;
  if (typeof city?.lat !== "number" || typeof city?.lng !== "number") return true;
  return distanceKm(city.lat, city.lng, lat, lng) <= maxKm;
}

/**
 * Reduce an address to a comparable form.
 *
 * The same building is written several ways across sources (e.g. abbreviations,
 * different spellings of floors or residences between Google Maps and internal records),
 * so an exact comparison would miss matches.
 * Abbreviations are expanded, accents and case folded, and the trailing city and
 * postal code dropped so that a Google address missing the city line still
 * matches the enriched one.
 */
export function normalizeAddress(address) {
  if (!address) return "";
  return String(address)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bavenues?\b/g, "av")
    .replace(/\bboulevards?\b/g, "bd")
    .replace(/\brue\b/g, "r")
    .replace(/\br[ée]sidence\b/g, "res")
    .replace(/[.,;#/]/g, " ")
    // "1 er étage" -> "1er étage": Google splits the ordinal from its digits.
    .replace(/(\d)\s+(?=[a-z])/g, "$1")
    // Drop the trailing postal code, which our rows append and Google omits.
    .replace(/\s+\d{5}\b/g, "")
    .replace(/\s+morocco\b|\s+maroc\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Last 9 digits of a Moroccan number, so +212531242380 and 0531242380 agree. */
export function phoneDigits(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.startsWith("212")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** Normalized website domain, ignoring aggregator and social platforms. */
export function normalizeWebsiteDomain(websiteUrl) {
  if (!websiteUrl) return null;
  try {
    let urlStr = String(websiteUrl).trim();
    if (!/^https?:\/\//i.test(urlStr)) urlStr = `http://${urlStr}`;
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host.length < 4) return null;

    const AGGREGATOR_HOSTS = [
      "facebook.com",
      "instagram.com",
      "wa.me",
      "whatsapp.com",
      "dabadoc.com",
      "dentisto.ma",
      "google.com",
      "maps.google.com",
      "linktr.ee",
      "linkedin.com",
      "twitter.com",
      "tiktok.com",
    ];
    if (AGGREGATOR_HOSTS.some((agg) => host === agg || host.endsWith(`.${agg}`))) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

const DENTAL_GENERIC_WORDS = new Set([
  "cabinet",
  "cabinets",
  "clinique",
  "cliniques",
  "centre",
  "centres",
  "center",
  "centers",
  "clinic",
  "clinics",
  "clinica",
  "clinicas",
  "dentaire",
  "dentaires",
  "dentiste",
  "dentistes",
  "dental",
  "dentist",
  "dentists",
  "docteur",
  "docteurs",
  "dr",
  "drs",
  "pr",
  "professeur",
  "chirurgien",
  "chirurgiens",
  "esthetique",
  "esthetiques",
  "estetica",
  "estetico",
  "smile",
  "orthodontie",
  "orthodontiste",
  "implantologie",
  "implants",
  "soins",
  "specialise",
  "tanger",
  "tangier",
  "casablanca",
  "rabat",
  "marrakech",
  "fes",
  "agadir",
  "maroc",
  "morocco",
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "et",
  "and",
]);

/** Extract core distinctive tokens from clinic name, stripping generic dental keywords. */
export function extractDistinctiveTokens(name) {
  if (!name) return [];
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !DENTAL_GENERIC_WORDS.has(token));
}

/** Check if two clinic names are compatible and share distinctive identifiers. */
export function haveCompatibleNames(name1, name2) {
  const norm1 = String(name1 || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  const norm2 = String(name2 || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (norm1 && norm2 && norm1 === norm2) return true;

  const tokens1 = extractDistinctiveTokens(name1);
  const tokens2 = extractDistinctiveTokens(name2);

  // If either name has no distinctive words (purely generic, e.g. "Cabinet Dentaire"),
  // only exact normalized name match is allowed to prevent accidental false matches.
  if (tokens1.length === 0 || tokens2.length === 0) {
    return false;
  }

  const set2 = new Set(tokens2);
  const shared = tokens1.filter((t) => set2.has(t));
  return shared.length > 0;
}

/**
 * Whether two records are the same practice, evaluated with strict confidence tiers.
 *
 * Prevents wrongful merges between different branches of the same chain or
 * multiple clinics sharing generic names/switchboards:
 *   1. Addresses are compared first: if both records have an address and they
 *      contradict, they are NEVER merged (protects distinct branch locations).
 *   2. Matching addresses or matching websites/phones require compatible distinctive
 *      names (e.g. "Dental Clinica El Ouazzani" and "Cabinet Dentaire El Ouazzani" share
 *      "ouazzani", whereas two different dentists in the same building do not).
 */
export function isSameClinicAs(incoming, existing) {
  if (!existing || !incoming) return false;
  if (existing.citySlug !== incoming.citySlug) return false;

  const city = String(incoming.citySlug ?? "").toLowerCase();
  const stripCity = (text) =>
    city ? text.replace(new RegExp(`\\b${city}\\b`, "g"), " ").replace(/\s+/g, " ").trim() : text;

  const inAddressRaw = incoming.address?.fr || incoming.addressFr || "";
  const exAddressRaw = existing.addressFr || existing.address?.fr || "";
  const inAddress = inAddressRaw ? stripCity(normalizeAddress(inAddressRaw)) : "";
  const exAddress = exAddressRaw ? stripCity(normalizeAddress(exAddressRaw)) : "";

  // 1. Both have addresses: physical address is the primary physical anchor
  if (inAddress && exAddress) {
    if (inAddress !== exAddress) {
      // Contradicting addresses in the same city: different locations/branches, DO NOT MERGE
      return false;
    }
    // Addresses match: verify names are compatible (guards against two different doctors in same medical building)
    if (haveCompatibleNames(incoming.name, existing.name)) {
      return true;
    }
    // If names don't match, verify phone or website confirms it's the exact same practice
    const inPhone = phoneDigits(incoming.phone);
    const exPhone = phoneDigits(existing.phone);
    if (inPhone && exPhone && inPhone === exPhone) return true;

    const inDomain = normalizeWebsiteDomain(incoming.website);
    const exDomain = normalizeWebsiteDomain(existing.website);
    if (inDomain && exDomain && inDomain === exDomain) return true;

    return false;
  }

  // 2. Website match with compatible distinctive name (when at least one lacks address)
  const inDomain = normalizeWebsiteDomain(incoming.website);
  const exDomain = normalizeWebsiteDomain(existing.website);
  if (inDomain && exDomain && inDomain === exDomain) {
    if (haveCompatibleNames(incoming.name, existing.name)) {
      return true;
    }
  }

  // 3. Phone match with compatible distinctive name (when at least one lacks address)
  const inPhone = phoneDigits(incoming.phone);
  const exPhone = phoneDigits(existing.phone);
  if (inPhone && exPhone && inPhone === exPhone) {
    if (haveCompatibleNames(incoming.name, existing.name)) {
      return true;
    }
  }

  // 4. Exact normalized name match
  const norm1 = String(incoming.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const norm2 = String(existing.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (norm1 && norm2 && norm1 === norm2) {
    // If both have different phones, do not merge
    if (inPhone && exPhone && inPhone !== exPhone) return false;
    return true;
  }

  return false;
}


/**
 * Keep a curated Arabic name instead of replacing it with a copy of the French one.
 *
 * A scraped clinic has `nameAr` equal to its French name, since Google only
 * returns the registered name. Any value that differs from the French name was
 * set by hand and must survive a re-sync.
 */
export function resolveNameAr(incomingName, incomingNameAr, existingNameAr) {
  if (existingNameAr && existingNameAr !== incomingName) return existingNameAr;
  return incomingNameAr || existingNameAr || incomingName;
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

/** Parse rating as a float between 0 and 5. */
export function parseRating(place) {
  if (typeof place?.rating === "number" && !Number.isNaN(place.rating)) {
    return Math.min(5, Math.max(0, place.rating));
  }
  if (typeof place?.rating === "string") {
    const parsed = parseFloat(place.rating.replace(",", "."));
    if (!Number.isNaN(parsed)) {
      return Math.min(5, Math.max(0, parsed));
    }
  }
  return 0;
}

/** Parse review count from reviews, user_reviews, or rating_summary. */
export function parseReviewCount(place) {
  // 1. Direct number on place.reviews
  if (typeof place?.reviews === "number" && !Number.isNaN(place.reviews)) {
    return Math.max(0, place.reviews);
  }

  // 2. String on place.reviews (e.g. "88", "88 avis", "1,234")
  if (typeof place?.reviews === "string") {
    const cleaned = place.reviews.replace(/[^0-9]/g, "");
    if (cleaned.length > 0) {
      const parsed = parseInt(cleaned, 10);
      if (!Number.isNaN(parsed)) return Math.max(0, parsed);
    }
  }

  // 3. User reviews / reviews_original if present
  if (typeof place?.user_reviews === "number") return Math.max(0, place.user_reviews);
  if (typeof place?.reviews_original === "number") return Math.max(0, place.reviews_original);

  // 4. Sum from rating_summary: [{ stars: 1, amount: 0 }, ... { stars: 5, amount: 88 }]
  if (Array.isArray(place?.rating_summary) && place.rating_summary.length > 0) {
    const sum = place.rating_summary.reduce((acc, curr) => {
      const amt = typeof curr?.amount === "number" ? curr.amount : 0;
      return acc + amt;
    }, 0);
    if (sum > 0) return sum;
  }

  return 0;
}

/** Map one SerpApi place result onto the app's `Clinic` shape. */
export function mapSerpApiPlaceToClinic(place, city) {
  const baseSlug = slugify(place.title || "cabinet-dentaire");
  // Both the place id and the slug suffix come from the same resolved identity,
  // so re-syncing a clinic always lands on the same row.
  const placeId = resolvePlaceId(place, city);
  const suffix = stableHash(placeId).slice(0, 6);

  const phone = normalizeMoroccanPhone(place.phone);
  const address = place.address || `${city.name}, Maroc`;
  const categories = [...(place.types ?? []), ...(place.type_ids ?? [])];
  const rating = parseRating(place) || 4.8;
  const reviewCount = parseReviewCount(place);
  const specialties = inferSpecialties(place.title, categories, place.description ?? "");

  return {
    slug: `${baseSlug}-${suffix}`,
    baseSlug,
    googlePlaceId: placeId,
    name: place.title,
    // SerpApi returns the registered name, which for a Moroccan clinic is the
    // French one. `nameAr` mirrors it here; the upsert keeps a curated Arabic
    // name instead of overwriting it with this copy.
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
    specialties: [],
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
/** Extract next page URL from serpapi_pagination, ensuring apiKey is attached. */
export function getNextPageUrl(data, apiKey) {
  const next = data?.serpapi_pagination?.next;
  if (!next) return null;
  try {
    const url = new URL(next);
    if (!url.searchParams.has("api_key") && apiKey) {
      url.searchParams.set("api_key", apiKey);
    }
    return url.toString();
  } catch {
    if (next.includes("api_key=")) return next;
    const separator = next.includes("?") ? "&" : "?";
    return apiKey ? `${next}${separator}api_key=${encodeURIComponent(apiKey)}` : next;
  }
}

/**
 * One `engine=google_maps` search scoped to a city via `ll=@lat,lng,zoom`.
 * Costs exactly 1 search credit.
 *
 * `hl` follows the query language via `languageForQuery` rather than being pinned
 * to French, and `nearby` is deliberately absent: `buildCityQueries` already puts
 * the city in the query text, and SerpApi's own guidance is that `nearby` is only
 * recommended for "near me" queries and not when the city is named in the query.
 * `ll` alone only biases results, it does not guarantee them, so callers still
 * have to filter through `isWithinCityRadius`.
 *
 * If `pageUrl` is provided (e.g. from `serpapi_pagination.next`), it is requested directly.
 */
export async function searchPlaces(city, query, apiKey, zoom = DEFAULT_ZOOM, pageUrl = null) {
  let url = pageUrl;
  if (!url) {
    const ll = `@${city.lat},${city.lng},${zoom}z`;
    const hl = languageForQuery(query);
    url =
      "https://serpapi.com/search.json?engine=google_maps&type=search" +
      `&q=${encodeURIComponent(query)}` +
      `&ll=${encodeURIComponent(ll)}` +
      `&hl=${hl}&gl=ma&api_key=${encodeURIComponent(apiKey)}`;
  } else {
    try {
      const parsed = new URL(url);
      if (!parsed.searchParams.has("api_key") && apiKey) {
        parsed.searchParams.set("api_key", apiKey);
      }
      url = parsed.toString();
    } catch {
      if (!url.includes("api_key=") && apiKey) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}api_key=${encodeURIComponent(apiKey)}`;
      }
    }
  }

  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    const text = await res.text();
    return { places: [], nextPageUrl: null, error: `SerpApi returned status ${res.status}: ${text.slice(0, 200)}` };
  }

  const data = await res.json();

  if (data.error) {
    return { places: [], nextPageUrl: null, error: `SerpApi error: ${data.error}` };
  }

  // When Google Maps finds multiple results, SerpApi returns data.local_results array.
  // When a query directly matches a specific place, SerpApi sets:
  //   data.search_information.local_results_state = "Showing results for type: 'place' instead of type: 'search'"
  // and returns a single object in data.place_results.
  const places = [];
  if (data.place_results && typeof data.place_results === "object") {
    places.push(data.place_results);
  }
  if (Array.isArray(data.local_results)) {
    for (const p of data.local_results) {
      if (
        !places.some(
          (existing) =>
            (existing.place_id && p.place_id && existing.place_id === p.place_id) ||
            (existing.data_id && p.data_id && existing.data_id === p.data_id),
        )
      ) {
        places.push(p);
      }
    }
  }

  const nextPageUrl = getNextPageUrl(data, apiKey);

  return { places, nextPageUrl };
}

/**
 * Search one city across every dental keyword, merging the overlap between
 * queries. Follows `serpapi_pagination` up to `maxPages` per query.
 * Stops early and records why once the budget cannot cover another search.
 */
export async function syncCityWithKeywords(city, apiKey, options = {}) {
  const {
    budget,
    keywords = DENTAL_KEYWORDS,
    delayMs = DEFAULT_DELAY_MS,
    zoom = DEFAULT_ZOOM,
    onQuery,
    maxRadiusKm = MAX_CITY_RADIUS_KM,
    maxPages = DEFAULT_MAX_PAGES,
  } = options;

  const maxPagesPerQuery = Math.max(1, Number(maxPages ?? DEFAULT_MAX_PAGES) || 1);
  const queries = buildCityQueries(city, keywords);
  const byPlaceId = new Map();
  const errors = [];
  const attempted = [];
  let searchesUsed = 0;
  let outOfRadius = 0;

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    let currentPage = 1;
    let nextPageUrl = null;

    while (currentPage <= maxPagesPerQuery) {
      if (budget && !budget.canAfford(1)) {
        errors.push(
          `Stopped after ${searchesUsed} searches: monthly budget reached (${budget.spent}/${budget.limit}).`,
        );
        break;
      }

      onQuery?.({
        city,
        query,
        index: i,
        total: queries.length,
        page: currentPage,
        maxPages: maxPagesPerQuery,
      });

      try {
        const { places, nextPageUrl: nextUrl, error } = await searchPlaces(
          city,
          query,
          apiKey,
          zoom,
          nextPageUrl,
        );
        searchesUsed++;
        if (currentPage === 1) attempted.push(query);
        budget?.spend(1);

        if (error) {
          errors.push(currentPage > 1 ? `${query} (page ${currentPage}): ${error}` : `${query}: ${error}`);
          break;
        }

        for (const place of places) {
          // A wider zoom can surface a neighbouring city's clinic; filing it under
          // the city being swept would put it in the wrong directory.
          if (!isWithinCityRadius(place, city, maxRadiusKm)) {
            outOfRadius++;
            continue;
          }

          const clinic = mapSerpApiPlaceToClinic(place, city);
          // Google returns the same clinic under several keywords. The resolved
          // place id is stable across keywords and across runs, so it is the
          // dedupe key. Merge specialties on repeat hits.
          const existing = byPlaceId.get(clinic.googlePlaceId);
          if (existing) {
            existing.specialtySlugs = Array.from(
              new Set([...existing.specialtySlugs, ...clinic.specialtySlugs]),
            );
            // The same place is reported once per keyword, and Google does not
            // return an identical figure each time: one keyword's local_results
            // window can carry a stale total. Keeping whichever keyword happened
            // to run first pinned the clinic to that snapshot, so a sync never
            // lifted the count. Reviews only ever accumulate, so take the highest
            // count seen and the rating that came with it.
            if (clinic.reviewCount > existing.reviewCount) {
              existing.reviewCount = clinic.reviewCount;
              existing.rating = clinic.rating;
              existing.verified = clinic.verified;
            }
          } else {
            byPlaceId.set(clinic.googlePlaceId, clinic);
          }
        }

        nextPageUrl = nextUrl;
        if (!nextPageUrl || places.length === 0) {
          break; // No further pages for this query
        }

        currentPage++;
        if (currentPage <= maxPagesPerQuery) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (err) {
        searchesUsed++;
        if (currentPage === 1) attempted.push(query);
        budget?.spend(1);
        errors.push(
          currentPage > 1
            ? `${query} (page ${currentPage}): ${err instanceof Error ? err.message : String(err)}`
            : `${query}: ${err instanceof Error ? err.message : String(err)}`,
        );
        break;
      }
    }

    if (budget && !budget.canAfford(1)) {
      break;
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
    // Reported rather than dropped silently, so a suspiciously low count on a big
    // city is explainable.
    outOfRadius,
    error: errors.length > 0 ? errors.join(" | ") : undefined,
  };
}

/**
 * Sync a list of cities, sharing one monthly budget across the whole run.
 */
export async function syncAllCities(targetCities, apiKey, options = {}) {
  const {
    budget = new SearchBudget(MONTHLY_SEARCH_BUDGET),
    keywords,
    delayMs = DEFAULT_DELAY_MS,
    maxPages = DEFAULT_MAX_PAGES,
    onQuery,
    onCity,
  } = options;

  // Conserve quota: 1 search per city when syncing all cities, or all specialties for 1 city
  // Operator-supplied keywords are validated against the catalogue, so a typo in
  // the admin form or a CLI flag cannot become a billable query.
  const requested = sanitizeKeywords(keywords);
  const effectiveKeywords =
    requested.length > 0
      ? requested
      : targetCities.length > 1
        ? PRIMARY_DENTAL_KEYWORDS
        : DENTAL_KEYWORDS;

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
      keywords: effectiveKeywords,
      delayMs,
      maxPages,
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
    outOfRadius: details.reduce((acc, r) => acc + (r.outOfRadius ?? 0), 0),
    searchBudget: budget.limit,
    searchesRemaining: budget.remaining,
    details,
  };
}