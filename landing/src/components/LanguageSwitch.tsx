import { useLocale } from "@/lib/i18n";
import type { Locale } from "@/content";

type Props = {
  className?: string;
};

export function LanguageSwitch({ className }: Props) {
  const { locale, setLocale, content } = useLocale();

  function select(next: Locale) {
    if (next !== locale) setLocale(next);
  }

  return (
    <div
      className={className ? `lang-switch ${className}` : "lang-switch"}
      role="group"
      aria-label={content.hero.langLabel}
    >
      <button
        type="button"
        className={locale === "zh-CN" ? "is-active" : undefined}
        aria-pressed={locale === "zh-CN"}
        onClick={() => select("zh-CN")}
      >
        {content.hero.langZh}
      </button>
      <span className="lang-switch-sep" aria-hidden>
        /
      </span>
      <button
        type="button"
        className={locale === "en" ? "is-active" : undefined}
        aria-pressed={locale === "en"}
        onClick={() => select("en")}
      >
        {content.hero.langEn}
      </button>
    </div>
  );
}
