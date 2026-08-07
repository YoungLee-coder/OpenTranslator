import { Fragment } from "react";
import { useContent, useLocale } from "@/lib/i18n";

export function Footer() {
  const { footer, site } = useContent();
  const { locale, setLocale } = useLocale();

  const links = [
    { href: site.repoUrl, label: footer.links.github, external: true },
    { href: site.readmeMdUrl, label: footer.links.readme, external: true },
    { href: site.issuesUrl, label: footer.links.contact, external: true },
  ] as const;

  return (
    <footer className="foot">
      <div className="colophon">
        <div className="links">
          {links.map((link, i) => (
            <Fragment key={link.label}>
              {i > 0 ? (
                <span className="sep" aria-hidden>
                  ·
                </span>
              ) : null}
              <a
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
              >
                {link.label}
              </a>
            </Fragment>
          ))}
          <span className="sep" aria-hidden>
            ·
          </span>
          <button
            type="button"
            className="foot-lang"
            onClick={() => setLocale(locale === "zh-CN" ? "en" : "zh-CN")}
          >
            {locale === "zh-CN" ? footer.links.switchEn : footer.links.switchZh}
          </button>
        </div>
        <p className="ethos">{footer.credit}</p>
      </div>
    </footer>
  );
}
