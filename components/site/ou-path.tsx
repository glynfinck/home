"use client";

import * as React from "react";

import { OU, simulateOu } from "@/lib/ou";
import { cn } from "@/lib/utils";

/** Points drawn per animation frame: the path draws in over about 1.5s. */
const STEP_PER_FRAME = 3;

/**
 * A mean-reverting path, simulated in the browser with a fresh seed on every
 * visit, with the long-run mean and the entry and exit levels from the
 * pairs-trading post, and a dot wherever the path would have traded.
 *
 * It draws in once and stops. With reduced motion it is drawn complete. The
 * server renders an empty canvas (the seed has to come from the visitor, or
 * every visitor would get the same path), and the figure is decorative, so it
 * is hidden from assistive technology.
 */
export function OuPath({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [run, setRun] = React.useState<{
    seed: number;
    roundTrips: number;
  } | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const seed = 1000 + Math.floor(Math.random() * 9000);
    const { path, trades } = simulateOu(seed);
    setRun({
      seed,
      roundTrips: trades.filter((t) => t.kind === "exit").length,
    });

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let shown = reduced ? path.length : 0;
    let frame = 0;

    function draw() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const styles = getComputedStyle(canvas);
      const brand = styles.getPropertyValue("--brand").trim();
      const muted = styles.getPropertyValue("--muted-foreground").trim();
      const surface = styles.getPropertyValue("--background").trim();
      const font = styles.getPropertyValue("--font-geist-mono").trim();

      const w = rect.width;
      const h = rect.height;
      const X = (i: number) => (i / (path.length - 1)) * w;
      const Y = (v: number) => h / 2 - v * h * 0.36;

      ctx.clearRect(0, 0, w, h);

      // Long-run mean, then the two trading levels, fainter.
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = muted;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(0, Y(OU.theta));
      ctx.lineTo(w, Y(OU.theta));
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      for (const level of [OU.exit, OU.entry]) {
        ctx.beginPath();
        ctx.moveTo(0, Y(level));
        ctx.lineTo(w, Y(level));
        ctx.stroke();
      }

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = brand;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < shown; i++) {
        if (i === 0) ctx.moveTo(X(i), Y(path[i]));
        else ctx.lineTo(X(i), Y(path[i]));
      }
      ctx.stroke();

      // Entries are hollow, exits filled: a filled dot is a closed trade.
      for (const trade of trades) {
        if (trade.step >= shown) continue;
        ctx.beginPath();
        ctx.arc(X(trade.step), Y(path[trade.step]), 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = trade.kind === "exit" ? brand : surface;
        ctx.fill();
        ctx.strokeStyle = brand;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Level labels go on last, each on a patch of background, so the path
      // never runs through the text.
      ctx.font = `10px ${font || "ui-monospace"}, ui-monospace, monospace`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const labels: [string, number][] = [
        ["exit b*", OU.exit],
        ["θ", OU.theta],
        ["entry d*", OU.entry],
      ];
      for (const [label, level] of labels) {
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = surface;
        ctx.fillRect(w - 4 - textWidth - 5, Y(level) - 8, textWidth + 10, 16);
        ctx.fillStyle = muted;
        ctx.fillText(label, w - 4, Y(level));
      }
    }

    function step() {
      shown = Math.min(path.length, shown + STEP_PER_FRAME);
      draw();
      if (shown < path.length) frame = requestAnimationFrame(step);
    }

    if (reduced) draw();
    else frame = requestAnimationFrame(step);

    // Redraw (without replaying) when the box resizes or the theme flips.
    const resize = new ResizeObserver(() => draw());
    resize.observe(canvas);
    const theme = new MutationObserver(() => draw());
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      theme.disconnect();
    };
  }, []);

  return (
    <div aria-hidden className={cn("pointer-events-none", className)}>
      <canvas ref={canvasRef} className="block h-32 w-full lg:h-full" />
      <p className="mt-2 h-4 text-right font-mono text-[10px] text-muted-foreground lg:absolute lg:right-1 lg:-bottom-6 lg:mt-0">
        {run
          ? `OU process · seed ${run.seed} · ${run.roundTrips} round ${run.roundTrips === 1 ? "trip" : "trips"}`
          : null}
      </p>
    </div>
  );
}
