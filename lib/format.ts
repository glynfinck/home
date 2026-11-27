const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  return DATE_FORMAT.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

const MONTH_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});

/**
 * Month and zero-padded day (`Jul 06`), for a date column under a year
 * heading. Padded so every entry is the same width in a monospace gutter.
 */
export function formatMonthDay(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  return MONTH_DAY_FORMAT.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

/** The UTC year as a string, or "" when there is no date. */
export function yearOf(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return String(date.getUTCFullYear());
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/**
 * Date with the time of day, in UTC — for logs where several entries land on
 * the same day and a bare date can't tell them apart. UTC to match the
 * download chart, which buckets by UTC day.
 */
export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  return DATE_TIME_FORMAT.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log2(bytes) / 10), units.length - 1);
  return `${(bytes / 2 ** (10 * i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** ~200 wpm reading-time estimate from MDX source. */
export function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
