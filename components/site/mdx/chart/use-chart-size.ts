"use client";

import { useEffect, useState, type RefObject } from "react";

/** Width the server renders at, before the client has measured anything. */
export const DEFAULT_CHART_WIDTH = 720;

/**
 * Measure a chart's available width.
 *
 * Charts draw their text as real SVG `<text>` at CSS pixel sizes rather than
 * scaling a fixed `viewBox`, because a viewBox that looks right at 768px
 * renders 6px labels at 327px. That means the geometry needs a real width.
 *
 * Before hydration the SVG is emitted at `DEFAULT_CHART_WIDTH` with
 * `max-width: 100%`, so a no-JS reader gets a proportionally scaled chart
 * instead of horizontal overflow.
 */
export function useChartSize(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(DEFAULT_CHART_WIDTH);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  // Shorter and squarer on phones, wider on desktop, always tall enough that
  // the x-axis band sits inside the box rather than forcing a nested scroll.
  const height = Math.round(Math.min(Math.max(width * 0.52, 200), 340));
  return { width, height };
}
