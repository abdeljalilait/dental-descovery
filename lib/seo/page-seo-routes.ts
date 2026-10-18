export const staticSeoRoutes = [
  { key: "home", label: "Home" },
  { key: "dentists", label: "Dentists directory" },
  { key: "treatments", label: "Treatments index" },
  { key: "blog", label: "Blog index" },
  { key: "app", label: "Dental App" },
  { key: "forClinics", label: "For clinics" },
  { key: "website", label: "Website offering" },
  { key: "pricing", label: "Pricing" },
  { key: "contact", label: "Contact" },
] as const;

export function citySeoRouteKey(citySlug: string): string {
  return `city:${citySlug}`;
}
