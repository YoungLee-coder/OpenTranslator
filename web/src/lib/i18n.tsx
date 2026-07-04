import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AiExpertMeta } from "@opentranslator/shared-types";
import { zhCN, type MessageKey } from "@/locales/zh-CN";
import { en } from "@/locales/en";

export type Locale = "zh-CN" | "en";

export const LOCALES: { id: Locale; labelKey: MessageKey }[] = [
  { id: "zh-CN", labelKey: "locale.zhCN" },
  { id: "en", labelKey: "locale.en" },
];

const catalogs = { "zh-CN": zhCN, en } as const;

const STORAGE_KEY = "opentranslator-locale";

export function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "zh-CN" || stored === "en") return stored;
  if (navigator.language.startsWith("en")) return "en";
  return "zh-CN";
}

function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template =
    catalogs[locale][key] ?? catalogs["zh-CN"][key] ?? String(key);
  return interpolate(template, params);
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useTranslation() {
  const { locale } = useLocale();
  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );
  return { t, locale };
}

export function expertLabel(expert: AiExpertMeta | undefined, locale: Locale): string {
  if (!expert) return "";
  return (
    expert.i18n?.[locale]?.name ??
    expert.i18n?.["zh-CN"]?.name ??
    expert.name
  );
}

export function expertDescription(
  expert: AiExpertMeta,
  locale: Locale,
): string {
  return (
    expert.i18n?.[locale]?.description ??
    expert.i18n?.["zh-CN"]?.description ??
    expert.description
  );
}
