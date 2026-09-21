import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { NavKey } from "@/fixtures/types";
import { LogoMark } from "@/components/LogoMark";
import { useContent } from "@/lib/i18n";
import { useDemoNav, type DemoView } from "./demo-nav";

type AppChromeProps = {
  active: NavKey;
  title: string;
  children: ReactNode;
};

const NAV_ORDER: readonly DemoView[] = ["translate", "write", "dashboard"];

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

/**
 * One glass pill that slides between items, mirroring the real app's `GlassNav`:
 * the active item is measured and a single absolutely-positioned chip animates
 * `left` / `width` instead of each item toggling its own background.
 */
function useSlidingIndicator(active: DemoView) {
  const navRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const measure = () => {
      const index = NAV_ORDER.indexOf(active);
      const el = index >= 0 ? itemRefs.current[index] : null;
      // Hidden views measure 0; stay invisible until a ResizeObserver reports.
      const ready = Boolean(el && el.offsetWidth > 0);
      const left = ready && el ? el.offsetLeft : 0;
      const width = ready && el ? el.offsetWidth : 0;
      setIndicator((prev) =>
        prev.left === left && prev.width === width && prev.ready === ready
          ? prev
          : { left, width, ready },
      );
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    for (const el of itemRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [active]);

  return { navRef, itemRefs, indicator };
}

/** Interactive app shell mirroring web RootLayout (liquid-glass nav). */
export function AppChrome({ active, title, children }: AppChromeProps) {
  const { product, site } = useContent();
  const labels = product.nav;
  const demo = useDemoNav();
  const { navRef, itemRefs, indicator } = useSlidingIndicator(active);

  return (
    <div
      className={demo?.dark ? "mock-app is-dark" : "mock-app"}
      role="region"
      aria-label={title}
    >
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
          {/* Real in-window navigation: this swaps the surface, not the carousel. */}
          <div className="mock-nav-links" ref={navRef}>
            <span
              className={
                indicator.ready
                  ? "mock-nav-indicator is-ready"
                  : "mock-nav-indicator"
              }
              aria-hidden
              style={{ left: indicator.left, width: indicator.width }}
            />
            {NAV_ORDER.map((key, index) => {
              const on = key === active;
              return (
                <button
                  key={key}
                  type="button"
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  aria-current={on ? "page" : undefined}
                  className={on ? "on" : undefined}
                  onClick={() => demo?.go(key)}
                >
                  {labels[key]}
                </button>
              );
            })}
          </div>
          <span className="mock-nav-rule" aria-hidden />
          <div className="mock-nav-trail">
            <button
              type="button"
              className="mock-icon-btn"
              aria-label={product.themeLabel}
              aria-pressed={Boolean(demo?.dark)}
              onClick={() => demo?.toggleDark()}
            >
              <MoonIcon />
            </button>
            <span className="mock-avatar" aria-hidden>
              Y
            </span>
          </div>
        </div>
      </div>
      {/* Not a document heading: this is the mock's own title bar. */}
      <div className="mock-body">
        <p className="mock-h1">{title}</p>
        {children}
      </div>
    </div>
  );
}
