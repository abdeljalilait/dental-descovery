import "server-only";
// Next 16 root-params may not export lang in some contexts; fallback to default
import { defaultLocale, locales, type Locale } from "./config";

export type Dictionary = typeof import("./dictionaries/fr.json");

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  fr: () => import("./dictionaries/fr.json").then((m) => m.default),
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
};

export async function getDictionaryFor(locale: Locale): Promise<Dictionary> {
  return (dictionaries[locale] ?? dictionaries[defaultLocale])();
}

export async function getDictionary(): Promise<Dictionary> {
  const value = undefined;
  // `lang()` is `string | undefined` (absent on a non-localized route), and the
  // guard keeps the narrowing explicit rather than relying on `includes`.
  const locale =
    value !== undefined && (locales as readonly string[]).includes(value)
      ? (value as Locale)
      : defaultLocale;
  return getDictionaryFor(locale);
}
