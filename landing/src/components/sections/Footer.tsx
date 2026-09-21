import { Fragment } from "react";
import { useContent, useLocale } from "@/lib/i18n";

export function Footer() {
  const { footer, site } = useContent();
  const { locale, setLocale } = useLocale();

  const links = [
    { href: site.repoUrl, label: footer.links.github },
    { href: site.readmeMdUrl, label: footer.links.readme },
    { href: site.releasesUrl, label: footer.links.releases },
    { href: site.licenseUrl, label: footer.links.license },
    { href: site.issuesUrl, label: footer.links.contact },
  ] as const;

  const nextLocale = locale === "zh-CN" ? "en" : "zh-CN";

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
              <a href={link.href} target="_blank" rel="noopener noreferrer">
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
            lang={nextLocale}
            onClick={() => setLocale(nextLocale)}
          >
            {nextLocale === "en" ? footer.links.switchEn : footer.links.switchZh}
          </button>
        </div>
        <p className="ethos">
          {footer.credit}
          {" · "}
          <a
            className="foot-version"
            href={site.releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {site.version}
          </a>
        </p>
      </div>
    </footer>
  );
}
