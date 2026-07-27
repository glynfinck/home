"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLinkStatus } from "next/link";

/**
 * Navigation feedback for every route, site and admin.
 *
 * `useLinkStatus` is the only supported way to observe a pending navigation,
 * and it only reports from inside the `<Link>` that was clicked. A bar at the
 * top of the viewport is not inside any link, so the two are joined by the
 * module-level store below: `<LinkPending />` sits in each link and publishes,
 * `<RouteProgress />` renders the viewport chrome and subscribes.
 *
 * A counter rather than a boolean. Clicking a second link before the first
 * settles leaves two sentinels pending, and a boolean would clear the bar on
 * whichever resolved first while the reader is still waiting for the other.
 */

let pendingCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => pendingCount > 0;
// The server never has a navigation in flight, so the bar starts hidden and
// hydrates without a mismatch.
const getServerSnapshot = () => false;

/**
 * Reports one link's pending state to the bar.
 *
 * Renders nothing. Drop it inside any `<Link>` whose destination is worth
 * waiting on; links to prefetched static routes resolve before the hold-back
 * below elapses and never light it up.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();

  useEffect(() => {
    if (!pending) return;
    pendingCount += 1;
    emit();
    return () => {
      pendingCount -= 1;
      emit();
    };
  }, [pending]);

  return null;
}

/** How long a navigation must be in flight before the bar appears. */
const HOLD_BACK_MS = 120;

/**
 * The bar itself. Mounted once in the root layout.
 *
 * Held back by 120ms so a prefetched navigation — which is most of them, now
 * that the content routes are statically generated — never flashes it. Nielsen's
 * 100ms limit is the floor: anything resolving faster than that already feels
 * instant, and an indicator would make it feel slower rather than faster.
 *
 * The width is a fiction. There is no progress to report, only elapsed time, so
 * it eases toward 90% and waits there. Claiming a percentage we cannot measure
 * would be worse than admitting the wait is indeterminate, which the easing does.
 */
export function RouteProgress() {
  const navigating = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const bar = useRef<HTMLDivElement>(null);
  // Whether the bar made it past the hold-back. A navigation that resolved
  // before it appeared should leave no trace, rather than flashing a
  // completion for something the reader never saw start.
  const shown = useRef(false);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;

    if (!navigating) {
      if (!shown.current) return;
      shown.current = false;
      // Run to full and fade. The completion is the only part of the width
      // that corresponds to anything real.
      el.style.transitionDuration = "180ms, 300ms";
      el.style.width = "100%";
      el.style.opacity = "0";
      return;
    }

    const timer = setTimeout(() => {
      shown.current = true;
      // Snap back to zero without animating, then ease out — otherwise a second
      // navigation starts from wherever the last one stopped.
      el.style.transitionDuration = "0ms";
      el.style.width = "0%";
      el.style.opacity = "1";
      void el.offsetWidth;
      el.style.transitionDuration = "2600ms, 200ms";
      el.style.width = "88%";
    }, HOLD_BACK_MS);

    return () => clearTimeout(timer);
  }, [navigating]);

  // Decorative, and deliberately silent: the route's `loading.tsx` shell
  // already announces "Loading" through `TerminalLoader`, and a second live
  // region saying the same thing is noise on a screen reader.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 print:hidden"
    >
      <div
        ref={bar}
        className="h-full w-0 bg-brand opacity-0 shadow-[0_0_10px_var(--brand)] transition-[width,opacity] ease-out motion-reduce:transition-none"
      />
    </div>
  );
}
