export const siteConfig = {
  name: "Dentora",
  shortName: "Dentora",
  domain: "dentora.ma",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://dentora.ma",
  country: "Maroc",
  countryAr: "المغرب",
  appName: "Dental App",
  appTagline: {
    fr: "La plateforme de gestion complète pour votre cabinet dentaire",
    ar: "منصة الإدارة المتكاملة لعيادة الأسنان الخاصة بك",
  },
  email: "contact@dentora.ma",
  phone: "+212 6 00 00 00 00",
  websiteDemoUrl: "https://drelouazzani.ma",
  googleAttribution: {
    fr: "Certaines informations proviennent de Google Maps.",
    ar: "بعض المعلومات مصدرها خرائط جوجل.",
  },
} as const;
