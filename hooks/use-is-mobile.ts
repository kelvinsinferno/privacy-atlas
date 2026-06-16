"use client";
import { useEffect, useState } from "react";

/** True when the viewport is phone-width. SSR + first paint return false
 *  (desktop) to avoid a hydration flash; the effect corrects it on mount. */
export function useIsMobile(maxWidth = 767): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [maxWidth]);
  return isMobile;
}
