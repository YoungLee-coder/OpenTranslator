import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { LogoMark } from "@/components/LogoMark";
import { useContent } from "@/lib/i18n";

export function Hero() {
  const { site, hero, nav } = useContent();

  return (
    <>
      <nav className="site-nav" aria-label="Primary">
        <a className="site-nav-brand" href="#top">
          <LogoMark size={28} variant="mark" className="site-nav-logo" decorative />
          <span>{site.productName}</span>
        </a>
        <div className="site-nav-links">
          <a className="nav-text" href="#features">
            {nav.features}
          </a>
          <a className="nav-text" href="#principles">
            {nav.principles}
          </a>
          <a className="site-nav-cta" href={site.repoUrl}>
            {nav.followCta}
          </a>
        </div>
      </nav>

      <header className="hero" id="top">
        <h1>{site.headline}</h1>
        <p className="tagline">{site.tagline}</p>

        <div className="hero-cta">
          <a className="btn-primary" href={site.repoUrl}>
            <DownloadSimpleIcon size={16} weight="regular" aria-hidden />
            {hero.repoCta}
          </a>
        </div>
        <p className="hero-meta">{hero.meta}</p>
        {hero.cloneHint ? (
          <p className="hero-code">
            {hero.cloneHint}{" "}
            <code>{hero.cloneCommand}</code>
          </p>
        ) : null}
      </header>
    </>
  );
}
