/** Map OpenTranslator lang codes to display names used in IT expert templates. */
const LANG_NAMES: Record<string, string> = {
  auto: "the detected source language",
  zh: "Simplified Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
  vi: "Vietnamese",
  th: "Thai",
};

export function langDisplayName(code: string): string {
  return LANG_NAMES[code] ?? code;
}

/** Immersive Translate langOverride id, e.g. "auto2zh" or "en2ja". */
export function langOverrideId(sourceLang: string, targetLang: string): string {
  return `${sourceLang}2${targetLang}`;
}
