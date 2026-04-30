import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(target: number, options?: { duration?: number; decimals?: number }) {
  const { duration = 900, decimals = 0 } = options || {};
  const [value, setValue] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const nextTarget = Number.isFinite(target) ? target : 0;
    const startValue = hasAnimatedRef.current ? value : 0;
    hasAnimatedRef.current = true;

    if (duration <= 0 || typeof window === "undefined") {
      setValue(nextTarget);
      return;
    }

    let frameId = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (nextTarget - startValue) * easedProgress;
      const multiplier = Math.pow(10, decimals);
      setValue(Math.round(nextValue * multiplier) / multiplier);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setValue(nextTarget);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [decimals, duration, target]);

  return value;
}
