import type { Locale } from "@/lib/i18n/config";

export interface TemplateVars {
  clinicName: string;
  cityName: string;
  profileUrl: string;
}

export interface CampaignTemplate {
  key: string;
  channel: "WHATSAPP";
  locale: Locale;
  name: string;
  body: string;
  variables: (keyof TemplateVars)[];
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: "dental-app-promo-fr",
    channel: "WHATSAPP",
    locale: "fr",
    name: "Dental App - Promo FR",
    body: "Bonjour {{clinicName}}, découvrez Dental App pour gérer votre cabinet à {{cityName}}. Voir votre fiche : {{profileUrl}}. Connectez-vous à votre espace via l'email de votre cabinet (OTP). Si votre email ne fonctionne plus, contactez-nous pour le corriger.",
    variables: ["clinicName", "cityName", "profileUrl"],
  },
  {
    key: "dental-app-promo-ar",
    channel: "WHATSAPP",
    locale: "ar",
    name: "Dental App - Promo AR",
    body: "مرحبًا {{clinicName}}، اكتشف تطبيق Dental App لإدارة عيادتكم في {{cityName}}. عرض الملف: {{profileUrl}}. يمكنكم تسجيل الدخول عبر بريدكم الإلكتروني باستلام رمز OTP. إذا لم يعد بريدكم يعمل، اتصلوا بنا لتصحيحه.",
    variables: ["clinicName", "cityName", "profileUrl"],
  },
];

export function getTemplateByKey(key: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.key === key);
}
