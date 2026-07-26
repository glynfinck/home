"use client";

import { useEffect, useRef } from "react";

/**
 * Hands the figure over to Vega in the browser.
 *
 * The server has already rendered the same spec to SVG, and that markup is
 * what the reader sees first: in the initial HTML, before hydration, and
 * forever if JavaScript never arrives. This component then loads the Vega
 * runtime and swaps in a live view, which is what brings the library's own
 * interactivity with it — tooltips, hover highlighting, and signal-driven
 * redraws are Vega's, not ours.
 *
 * The runtime is imported dynamically so it lands in its own chunk, requested
 * only by pages that contain a figure and never blocking first paint.
 *
 * `signals` drives parameterised figures: a change updates the named signal on
 * the live view and Vega redraws. The control stays in React because Vega's
 * `bind` widget would replace a slider the site already styles and the browser
 * tests already pin.
 */
export function VegaView({
  spec,
  data,
  signals,
  fallback,
  className,
}: {
  /** Vega spec compiled from Vega-Lite on the server, with its rows lifted out. */
  spec: Record<string, unknown>;
  /** Those rows, shared by both breakpoints so they ship once. */
  data: Record<string, unknown[]>;
  signals?: Record<string, number>;
  /** Server-rendered SVG, shown until the live view has painted. */
  fallback: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const ssr = useRef<HTMLDivElement>(null);
  const view = useRef<{
    signal: (name: string, value?: number) => unknown;
    run: () => void;
    finalize: () => void;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let instance: { finalize: () => void } | null = null;

    const mount = async () => {
      const [vega, { Handler }] = await Promise.all([
        import("vega"),
        import("vega-tooltip"),
      ]);
      if (cancelled || !host.current) return;

      // The browser bundle is a separate module instance from the server's, so
      // it carries d3's default number locale — which writes negatives with
      // U+2212. Without this the figure's own labels change character the
      // moment it hydrates, and disagree with the prose beside them.
      vega.formatLocale({
        decimal: ".",
        thousands: ",",
        grouping: [3],
        currency: ["$", ""],
        minus: "-",
      });

      const live = new vega.View(
        vega.parse(spec as Parameters<typeof vega.parse>[0]),
        { renderer: "svg", container: host.current, hover: true },
      );

      for (const [name, values] of Object.entries(data)) {
        live.data(name, values);
      }
      for (const [name, value] of Object.entries(signals ?? {})) {
        live.signal(name, value);
      }
      live.tooltip(new Handler({ offsetX: 8, offsetY: 8 }).call);

      await live.runAsync();
      if (cancelled) {
        live.finalize();
        return;
      }

      instance = live;
      view.current = live as unknown as typeof view.current;
      // Swapped only once the live view has painted, so the figure never blinks.
      if (ssr.current) ssr.current.style.display = "none";
    };

    // Deferred until the figure is near the viewport. An article carries four
    // of these, and building four scenegraphs during hydration competes with
    // the rest of the page for the main thread — enough to visibly delay the
    // controls on a slow machine. Until then the server-rendered SVG is what
    // is on screen, which is the whole point of having it.
    const target = host.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      void mount();
      return () => {
        cancelled = true;
        instance?.finalize();
        view.current = null;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void mount();
      },
      { rootMargin: "300px" },
    );
    observer.observe(target);

    return () => {
      cancelled = true;
      observer.disconnect();
      instance?.finalize();
      view.current = null;
    };
    // `spec` is a server prop, fixed for the life of the page. Signal changes
    // are applied to the running view below rather than by rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const live = view.current;
    if (!live || !signals) return;

    let changed = false;
    for (const [name, value] of Object.entries(signals)) {
      if (live.signal(name) !== value) {
        live.signal(name, value);
        changed = true;
      }
    }
    if (changed) live.run();
  }, [signals]);

  return (
    <div className={className}>
      <div
        ref={ssr}
        className="[&>svg]:h-auto [&>svg]:max-w-full"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: fallback }}
      />
      <div ref={host} aria-hidden="true" className="[&_svg]:h-auto [&_svg]:max-w-full" />
    </div>
  );
}
