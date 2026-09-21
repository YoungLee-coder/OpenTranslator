import { useCallback, useEffect, useRef, useState } from "react";
import { GitHubIcon } from "@/components/GitHubIcon";
import { LogoMark } from "@/components/LogoMark";
import { useContent } from "@/lib/i18n";

function CopyGlyph({ copied }: { copied: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {copied ? (
        <path d="M3.5 8.5 6.5 11.5 12.5 5" />
      ) : (
        <>
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 3.5V3a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v6A1.5 1.5 0 0 0 4 10.5h.5" />
        </>
      )}
    </svg>
  );
}

/** `git clone` hint with a copy-to-clipboard affordance. */
function CloneHint() {
  const { hero } = useContent();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    const command = hero.cloneCommand;
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
        ok = true;
      } else {
        // Insecure origins have no async clipboard API; fall back to a temp selection.
        const scratch = document.createElement("textarea");
        scratch.value = command;
        scratch.setAttribute("readonly", "");
        scratch.style.position = "fixed";
        scratch.style.opacity = "0";
        document.body.append(scratch);
        scratch.select();
        ok = document.execCommand("copy");
        scratch.remove();
      }
    } catch {
      ok = false;
    }
    // Stay quiet when the clipboard is unavailable — the command is still selectable.
    if (!ok) return;
    setCopied(true);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1600);
  }, [hero.cloneCommand]);

  if (!hero.cloneHint) return null;

  return (
    <p className="hero-code">
      <span className="hero-code-hint">{hero.cloneHint}</span>
      <code>{hero.cloneCommand}</code>
      <button
        type="button"
        className={copied ? "copy-btn is-copied" : "copy-btn"}
        onClick={copy}
        aria-label={hero.copyLabel}
      >
        <CopyGlyph copied={copied} />
      </button>
      <span className="sr-only" role="status">
        {copied ? hero.copiedLabel : ""}
      </span>
    </p>
  );
}

export function Hero() {
  const { site, hero, nav } = useContent();

  return (
    <>
      <nav className="site-nav" aria-label={nav.ariaLabel}>
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
            <GitHubIcon size={16} />
            {hero.repoCta}
          </a>
          <a className="btn-secondary" href={site.readmeUrl}>
            {hero.readmeCta}
          </a>
        </div>
        <p className="hero-meta">{hero.meta}</p>
        <CloneHint />
      </header>
    </>
  );
}
