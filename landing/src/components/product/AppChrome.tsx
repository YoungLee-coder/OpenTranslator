import type { ReactNode } from "react";
import type { NavKey } from "@/fixtures/types";
import type { GallerySlideId } from "@/content";
import { LogoMark } from "@/components/LogoMark";
import { useContent } from "@/lib/i18n";
import { useGalleryNav } from "./gallery-nav";

type AppChromeProps = {
  active: NavKey;
  title: string;
  children: ReactNode;
};

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function navToSlide(key: NavKey, activeId: GallerySlideId | undefined): GallerySlideId {
  if (key === "translate") return "translate";
  if (key === "write") return "write";
  if (activeId === "providers") return "providers";
  return "overview";
}

/** Interactive app shell mirroring web RootLayout (liquid-glass nav). */
export function AppChrome({ active, title, children }: AppChromeProps) {
  const { product, site } = useContent();
  const labels = product.nav;
  const galleryNav = useGalleryNav();

  return (
    <div className="mock-app" role="region" aria-label={title}>
      <div className="mock-nav">
        <div className="mock-nav-pill">
          <div className="mock-brand">
            <span className="mock-brand-mark">
              <LogoMark
                size={22}
                variant="mark"
                decorative
                haloFill="var(--glass-bg-fallback)"
              />
            </span>
            <span>{site.productName}</span>
          </div>
          <span className="mock-nav-rule" aria-hidden />
          <div className="mock-nav-links" role="tablist" aria-label={title}>
            {(Object.keys(labels) as NavKey[]).map((key) => {
              const on = key === active;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={on ? "on" : undefined}
                  onClick={() =>
                    galleryNav?.goTo(navToSlide(key, galleryNav.activeId))
                  }
                >
                  {labels[key]}
                </button>
              );
            })}
          </div>
          <span className="mock-nav-rule" aria-hidden />
          <div className="mock-nav-trail">
            <button type="button" className="mock-icon-btn" aria-label="Theme">
              <MoonIcon />
            </button>
            <span className="mock-avatar" aria-hidden>
              Y
            </span>
          </div>
        </div>
      </div>
      <div className="mock-body">
        <h3 className="mock-h1">{title}</h3>
        {children}
      </div>
    </div>
  );
}
