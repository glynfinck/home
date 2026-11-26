"use client";

import * as React from "react";

const MINUTE = 60_000;

/** Re-render on the minute. The snapshot is the minute itself, so React only
 *  re-renders when the displayed value can have changed. */
function subscribe(notify: () => void) {
  const timer = setInterval(notify, 15_000);
  return () => clearInterval(timer);
}
const currentMinute = () => Math.floor(Date.now() / MINUTE);
// The server cannot know the visitor's "now". Null renders the placeholder,
// and the real value arrives on hydration without a mismatch.
const noMinute = () => null;

function useMinute(): number | null {
  return React.useSyncExternalStore(subscribe, currentMinute, noMinute);
}

/**
 * The owner's local time, for the footer: it answers "is this person likely to
 * be around" for someone about to send an email.
 */
export function LocalClock({ timeZone }: { timeZone: string }) {
  const minute = useMinute();

  let time = "--:--";
  if (minute !== null) {
    try {
      time = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
      }).format(minute * MINUTE);
    } catch {
      // An unknown zone name in settings: keep the placeholder.
    }
  }

  return <span className="text-foreground tabular-nums">{time}</span>;
}

function ago(from: number, to: number): string {
  const minutes = Math.max(0, Math.floor((to - from) / MINUTE));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * How long ago this build was deployed. Server-renders the date, which is
 * always true, and swaps to the relative form once the visitor's clock is
 * known; a relative time baked into cached HTML would be wrong within the hour.
 */
export function DeployAge({
  iso,
  fallback,
}: {
  iso: string;
  fallback: string;
}) {
  const minute = useMinute();
  const built = Date.parse(iso);

  return (
    <time dateTime={iso}>
      {minute === null || Number.isNaN(built)
        ? fallback
        : ago(built, minute * MINUTE)}
    </time>
  );
}
