import "server-only";
import { lang } from "next/root-params";
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
  const value = await lang();
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : defaultLocale;
  return getDictionaryFor(locale);
}
