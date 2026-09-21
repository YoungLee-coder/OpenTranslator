import { useCallback, useEffect, useRef, useState } from "react";
import type { CaptionKey, DemoRoute, DemoView, QuickTabKey } from "@/content";
import { useContent } from "@/lib/i18n";
import { ProductWindow } from "@/components/product/ProductWindow";
import { AppChrome } from "@/components/product/AppChrome";
import { TranslatePanel } from "@/components/product/TranslatePanel";
import { WritePanel } from "@/components/product/WritePanel";
import { DashboardPanel } from "@/components/product/dashboard/DashboardPanel";
import {
  DemoNavProvider,
  captionKey,
  sameRoute,
} from "@/components/product/demo-nav";

const INTERVAL_MS = 4500;

/** Stops the idle tour cycles through. */
const TOUR: readonly DemoRoute[] = [
  { view: "translate" },
  { view: "write" },
  { view: "dashboard", tab: "overview" },
  { view: "dashboard", tab: "providers" },
];

const QUICK_ROUTES: Record<QuickTabKey, DemoRoute> = {
  translate: { view: "translate" },
  write: { view: "write" },
  overview: { view: "dashboard", tab: "overview" },
  providers: { view: "dashboard", tab: "providers" },
};

function nextTourStop(current: DemoRoute): DemoRoute {
  const i = TOUR.findIndex((stop) => sameRoute(stop, current));
  return TOUR[(i + 1) % TOUR.length] ?? TOUR[0]!;
}

/**
 * One persistent app shell whose body swaps between mounted views — the same
 * shape as the real `RootLayout` + `<Outlet/>`. Keeping the chrome mounted is
 * what lets the glass pill slide between nav items instead of blinking.
 */
function DemoSurface({ route }: { route: DemoRoute }) {
  const { product } = useContent();
  const [mounted, setMounted] = useState<ReadonlySet<DemoView>>(
    () => new Set([route.view]),
  );

  useEffect(() => {
    setMounted((prev) =>
      prev.has(route.view) ? prev : new Set(prev).add(route.view),
    );
  }, [route.view]);

  const title =
    route.view === "translate"
      ? product.translate.pageTitle
      : route.view === "write"
        ? product.write.pageTitle
        : product.dashboard.pageTitle;

  return (
    <div className="demo-view">
      <AppChrome active={route.view} title={title}>
        {mounted.has("translate") ? (
          <div className="mock-keep" hidden={route.view !== "translate"}>
            <TranslatePanel />
          </div>
        ) : null}
        {mounted.has("write") ? (
          <div className="mock-keep" hidden={route.view !== "write"}>
            <WritePanel />
          </div>
        ) : null}
        {mounted.has("dashboard") ? (
          <div className="mock-keep" hidden={route.view !== "dashboard"}>
            <DashboardPanel
              activeTab={route.view === "dashboard" ? route.tab : "overview"}
            />
          </div>
        ) : null}
      </AppChrome>
    </div>
  );
}

export function Gallery() {
  const { gallery } = useContent();
  const [route, setRoute] = useState<DemoRoute>({ view: "translate" });
  const [dark, setDark] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const sectionRef = useRef<HTMLElement | null>(null);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const engage = useCallback(() => setEngaged(true), []);

  const go = useCallback((view: DemoView) => {
    if (view === "dashboard") {
      // Same as the real app: re-entering the dashboard from another surface
      // starts on 概览, but staying put keeps the tab you were on.
      setRoute((prev) => ({
        view: "dashboard",
        tab: prev.view === "dashboard" ? prev.tab : "overview",
      }));
      return;
    }
    setRoute({ view });
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Idle tour. Any click or keystroke inside the demo stops it for good.
  useEffect(() => {
    if (reduceMotion || paused || !inView || !tabVisible || engaged) return;
    const timer = window.setInterval(() => {
      setRoute((prev) => nextTourStop(prev));
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion, paused, inView, tabVisible, engaged, route]);

  const current = captionKey(route);
  const caption = gallery.captions[current];

  return (
    <section
      className="gallery-section"
      aria-label={gallery.sectionTitle}
      ref={sectionRef}
    >
      <div
        className="gallery"
        onPointerDownCapture={engage}
        onKeyDownCapture={engage}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
      >
        <DemoNavProvider
          value={{
            route,
            go,
            openTab: (tab) => setRoute({ view: "dashboard", tab }),
            dark,
            toggleDark: () => setDark((prev) => !prev),
          }}
        >
          <div className="product-stage">
            <div className="product-frame">
              <ProductWindow title={gallery.windowTitle}>
                <div className="gallery-frame-surface">
                  <DemoSurface route={route} />
                </div>
              </ProductWindow>
              {gallery.chips?.map((chip, i) => (
                <div
                  key={chip.label}
                  className={`gallery-chip gallery-chip-${i + 1}`}
                  aria-hidden
                >
                  <kbd>{chip.key}</kbd>
                  <span>{chip.label}</span>
                </div>
              ))}
            </div>
          </div>
        </DemoNavProvider>

        <div className="gallery-footer">
          <div className="gallery-caption">
            <p className="title">{caption.title}</p>
            <p className="line">{caption.line}</p>
          </div>
          <div className="gallery-tabs" aria-label={gallery.tabsAria}>
            {gallery.quickTabs.map((tab) => {
              const target = QUICK_ROUTES[tab.key];
              const on = sameRoute(target, route);
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={on ? "is-active" : undefined}
                  aria-pressed={on}
                  onClick={() => {
                    engage();
                    setRoute(target);
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
