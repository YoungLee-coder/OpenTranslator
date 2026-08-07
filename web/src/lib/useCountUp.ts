import { useEffect, useRef, useState } from "react";

function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** 克制的数字滚入：从当前值过渡到目标，ease-out，尊重 prefers-reduced-motion。 */
export function useCountUp(
  target: number,
  opts?: { durationMs?: number; delayMs?: number; enabled?: boolean },
): number {
  const durationMs = opts?.durationMs ?? 780;
  const delayMs = opts?.delayMs ?? 0;
  const enabled = opts?.enabled ?? true;
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(() =>
    enabled && !reduced ? 0 : target,
  );
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!enabled || reduced) {
      setValue(target);
      return;
    }

    const from = valueRef.current;
    if (from === target) return;

    let raf = 0;
    let start = 0;
    let timeoutId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(from + (target - from) * easeOutQuart(t)));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    const begin = () => {
      start = performance.now();
      raf = requestAnimationFrame(tick);
    };

    if (delayMs > 0) {
      timeoutId = window.setTimeout(begin, delayMs);
    } else {
      begin();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeoutId);
    };
  }, [target, durationMs, delayMs, enabled, reduced]);

  return value;
}
