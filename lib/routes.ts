export const routes = {
  home: "",
  dentists: "dentistes",
  treatments: "traitements",
  blog: "blog",
  app: "dental-app",
  forClinics: "pour-les-cliniques",
  website: "site-web-dentaire",
  pricing: "tarifs",
  contact: "contact",
} as const;

export type RouteKey = keyof typeof routes;

export function localizedPath(route: RouteKey, locale: string): string {
  const segment = routes[route];
  return segment ? `/${locale}/${segment}` : `/${locale}`;
}

export function cityPath(locale: string, citySlug: string): string {
  return `/${locale}/${routes.dentists}/${citySlug}`;
}

export function clinicPath(locale: string, citySlug: string, clinicSlug: string): string {
  return `/${locale}/${routes.dentists}/${citySlug}/${clinicSlug}`;
}

export function treatmentPath(locale: string, treatmentSlug: string): string {
  return `/${locale}/${routes.treatments}/${treatmentSlug}`;
}

export function blogPostPath(locale: string, postSlug: string): string {
  return `/${locale}/${routes.blog}/${postSlug}`;
}
