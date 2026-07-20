import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type { GallerySlideId } from "@/content";
import { useContent } from "@/lib/i18n";
import { ProductWindow } from "@/components/product/ProductWindow";
import { TranslateWorkbench } from "@/components/product/TranslateWorkbench";
import { WriteWorkbench } from "@/components/product/WriteWorkbench";
import { OverviewWorkbench } from "@/components/product/OverviewWorkbench";
import { ProvidersWorkbench } from "@/components/product/ProvidersWorkbench";
import { GalleryNavProvider } from "@/components/product/gallery-nav";

const INTERVAL_MS = 4500;
const SWITCH_MS = 920;

function SlideView({ id }: { id: GallerySlideId }) {
  switch (id) {
    case "translate":
      return <TranslateWorkbench />;
    case "write":
      return <WriteWorkbench />;
    case "overview":
      return <OverviewWorkbench />;
    case "providers":
      return <ProvidersWorkbench />;
  }
}

export function Gallery() {
  const { gallery } = useContent();
  const slides = gallery.slides;
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [switching, setSwitching] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const switchTimerRef = useRef<number | null>(null);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const slide = slides[index]!;
  const activeId = slide.id;

  const stop = useEffectEvent(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  });

  const start = useEffectEvent(() => {
    if (reduceMotion || paused || timerRef.current != null) return;
    timerRef.current = window.setInterval(() => {
      activate((index + 1) % slides.length);
    }, INTERVAL_MS);
  });

  const activate = useEffectEvent((next: number) => {
    if (next === index) return;
    const len = slides.length;
    const delta = (next - index + len) % len;
    setDirection(delta > len / 2 ? "prev" : "next");
    setPrevIndex(index);
    setSwitching(true);
    if (switchTimerRef.current != null) {
      window.clearTimeout(switchTimerRef.current);
    }
    switchTimerRef.current = window.setTimeout(() => {
      setSwitching(false);
      setPrevIndex(null);
      switchTimerRef.current = null;
    }, SWITCH_MS);
    setIndex(next);
  });

  useEffect(() => {
    start();
    return () => {
      stop();
      if (switchTimerRef.current != null) {
        window.clearTimeout(switchTimerRef.current);
      }
    };
  }, [start, stop]);

  // Restart interval when index changes so dwell time stays consistent.
  useEffect(() => {
    stop();
    start();
  }, [index, paused, start, stop]);

  function go(next: number) {
    stop();
    activate(next);
    start();
  }

  function goTo(id: GallerySlideId) {
    const next = slides.findIndex((s) => s.id === id);
    if (next < 0) return;
    setPaused(true);
    go(next);
  }

  return (
    <section>
      <div className="section-head">
        <p className="section-num">{gallery.sectionNum}</p>
        <h2 className="section-title">{gallery.sectionTitle}</h2>
        <p className="section-lede">{gallery.sectionLede}</p>
      </div>

      <div
        className={switching ? "gallery is-switching" : "gallery"}
        data-gallery
        data-direction={direction}
        onMouseEnter={() => {
          setPaused(true);
          stop();
        }}
        onMouseLeave={() => {
          setPaused(false);
        }}
        onFocusCapture={() => {
          setPaused(true);
          stop();
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
      >
        <GalleryNavProvider value={{ activeId, goTo }}>
          <ProductWindow title={slide.windowTitle}>
            <div className="gallery-frame-surface">
              {slides.map((s, i) => {
                const active = i === index;
                const wasActive = i === prevIndex;
                let className = "gallery-panel";
                if (active) className += " is-active";
                if (wasActive) className += " was-active";
                return (
                  <div
                    key={s.id}
                    className={className}
                    aria-hidden={active ? false : true}
                    inert={!active}
                  >
                    <SlideView id={s.id} />
                  </div>
                );
              })}
            </div>
          </ProductWindow>
        </GalleryNavProvider>

        <div className="gallery-caption">
          <p className="title">{slide.title}</p>
          <p className="line">{slide.line}</p>
        </div>
        <div className="gallery-tabs" aria-label={gallery.tabsAria}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i === index ? "is-active" : undefined}
              aria-pressed={i === index}
              onClick={() => {
                setPaused(true);
                go(i);
              }}
            >
              {s.tab}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
