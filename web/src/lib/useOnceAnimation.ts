import { useEffect, useRef, useState } from "react";

/**
 * 进场 class 只挂一轮，结束后卸掉。
 * 避免 TabsContent `display:none` 切回时 CSS keyframes 重放造成闪白。
 */
export function useOnceAnimation(ready: boolean, durationMs: number): boolean {
  const [playing, setPlaying] = useState(false);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!ready || playedRef.current) return;
    playedRef.current = true;
    setPlaying(true);
    const id = window.setTimeout(() => setPlaying(false), durationMs);
    return () => window.clearTimeout(id);
  }, [ready, durationMs]);

  return playing;
}
