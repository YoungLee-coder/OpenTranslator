import type { MessageKey } from "@/locales/zh-CN";

export interface Language {
  code: string;
  name: string;
}

/** "auto" is only valid as a source language (lets the model detect). */
export const LANGUAGES: Language[] = [
  { code: "auto", name: "auto" },
  { code: "zh", name: "zh" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "th", name: "ไทย" },
];

const UI_NAME_KEYS: Partial<Record<string, MessageKey>> = {
  auto: "languages.auto",
  zh: "languages.zh",
};

export function languageName(
  code: string,
  t: (key: MessageKey) => string,
): string {
  const key = UI_NAME_KEYS[code];
  if (key) return t(key);
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
