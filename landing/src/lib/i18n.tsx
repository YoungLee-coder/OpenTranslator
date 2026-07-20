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

const STORAGE_KEY = "opentranslator-locale";

export function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "zh-CN" || stored === "en") return stored;
  if (navigator.language.toLowerCase().startsWith("en")) return "en";
  return "zh-CN";
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
  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute("content", content.meta.description);
  }
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", content.meta.title);
  const ogDescription = document.querySelector(
    'meta[property="og:description"]',
  );
  if (ogDescription) {
    ogDescription.setAttribute("content", content.meta.description);
  }
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) {
    ogLocale.setAttribute(
      "content",
      locale === "en" ? "en_US" : "zh_CN",
    );
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);
  const content = catalogs[locale];

  useEffect(() => {
    applyDocumentMeta(locale, content);
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale, content]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
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
