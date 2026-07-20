import { useContent } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export function Hero() {
  const { site, hero } = useContent();

  return (
    <header className="hero">
      <div className="eyebrow">
        <span>
          {site.category} ·{" "}
          <a className="version-link" href={site.releasesUrl}>
            {site.version}
          </a>
        </span>
        <span className="hero-links">
          <LanguageSwitch />
          <a href={site.repoUrl} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </span>
      </div>

      <h1>{site.productName}</h1>
      <p className="tagline">{site.tagline}</p>

      <div className="hero-tokens">
        {site.tokens.map((token) => (
          <span key={token}>{token}</span>
        ))}
      </div>

      <div className="hero-cta">
        <a className="btn-ghost" href={site.readmeUrl}>
          {hero.readmeCta}
        </a>
        <a className="btn-primary" href={site.repoUrl}>
          {hero.repoCta}
        </a>
      </div>
    </header>
  );
}
