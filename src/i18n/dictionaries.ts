import "server-only";
import type { Locale } from "./config";
import en from "./dictionaries/en.json";
import ar from "./dictionaries/ar.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  ar: ar as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}
