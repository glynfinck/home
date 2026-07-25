/**
 * Reading progress bar, pinned under the sticky navbar.
 *
 * Pure CSS via a scroll-driven animation, so it costs no JavaScript and no
 * scroll listener. Browsers without `animation-timeline` simply render a bar
 * that never advances, so the element is hidden until support is confirmed
 * (see `@supports` in globals.css).
 *
 * Server component on purpose: it must not force the article into the client
 * bundle just to draw a line.
 */
export function ReadingProgress() {
  return (
    <div
      aria-hidden
      className="reading-progress pointer-events-none fixed inset-x-0 top-14 z-40 h-0.5 print:hidden"
    >
      <div className="reading-progress-bar h-full origin-left bg-brand" />
    </div>
  );
}
