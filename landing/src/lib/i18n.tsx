import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { catalogs, type Content, type Locale } from "@/content";

/** Landing-only preference; unset → follow browser language. */
const STORAGE_KEY = "opentranslator-landing-locale";

/** Prefer the first supported tag in the browser language list. */
export function localeFromBrowser(): Locale {
  if (typeof navigator === "undefined") return "zh-CN";
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ]
    .filter(Boolean)
    .map((tag) => tag.toLowerCase());

  for (const tag of candidates) {
    if (tag === "zh" || tag.startsWith("zh-")) return "zh-CN";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "zh-CN";
}

export function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "zh-CN" || stored === "en") return stored;
  return localeFromBrowser();
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  content: Content;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyDocumentMeta(locale: Locale, content: Content) {
  document.documentElement.lang = locale;
  document.title = content.meta.title;

  const setMeta = (selector: string, value: string) => {
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", value);
  };

  setMeta('meta[name="description"]', content.meta.description);
  setMeta('meta[property="og:title"]', content.meta.title);
  setMeta('meta[property="og:description"]', content.meta.description);
  setMeta('meta[property="og:locale"]', locale === "en" ? "en_US" : "zh_CN");
  setMeta('meta[name="twitter:title"]', content.meta.title);
  setMeta('meta[name="twitter:description"]', content.meta.description);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);
  const content = catalogs[locale];

  useEffect(() => {
    applyDocumentMeta(locale, content);
  }, [locale, content]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, content }),
    [locale, setLocale, content],
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

export function useContent() {
  return useLocale().content;
}
