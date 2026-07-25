import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Shared chrome for every generated Open Graph card.
 *
 * Satori supports only a subset of CSS and has no access to the Tailwind
 * tokens, so the palette below is a hand-kept mirror of the dark theme in
 * `app/globals.css`. Update both together.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export const ogColors = {
  background: "#09090b",
  foreground: "#fafafa",
  muted: "#a1a1aa",
  subtle: "#52525b",
  brand: "#34d399",
  dot: "#3f3f46",
  border: "rgba(255,255,255,0.10)",
};

/**
 * The hero's dot grid, baked into an SVG data URI.
 *
 * Satori cannot tile a gradient background, so the radial fade is applied as
 * per-dot opacity instead of a mask.
 */
export function dotGrid(): string {
  const spacing = 28;
  const focal = { x: 320, y: 250 };
  const reach = 720;
  let circles = "";
  for (let x = 14; x < OG_SIZE.width; x += spacing) {
    for (let y = 14; y < OG_SIZE.height; y += spacing) {
      const d = Math.hypot(x - focal.x, y - focal.y);
      const opacity = Math.max(0, 1 - d / reach) ** 1.5;
      if (opacity < 0.04) continue;
      circles += `<circle cx="${x}" cy="${y}" r="2" opacity="${opacity.toFixed(2)}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_SIZE.width}" height="${OG_SIZE.height}"><g fill="${ogColors.dot}">${circles}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Geist TTFs live in `assets/fonts/`; `next/font` output isn't reachable here. */
export async function loadOgFonts() {
  const [semiBold, regular, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Geist-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/GeistMono-Medium.ttf")),
  ]);

  return [
    { name: "Geist", data: semiBold, style: "normal" as const, weight: 600 as const },
    { name: "Geist", data: regular, style: "normal" as const, weight: 400 as const },
    { name: "Geist Mono", data: mono, style: "normal" as const, weight: 500 as const },
  ];
}

/**
 * Titles vary from a few words to a full sentence, so step the size down as
 * the string grows. Satori has no text-fitting, and an overflowing title is
 * silently clipped rather than wrapped past the card edge.
 */
export function titleFontSize(title: string): number {
  if (title.length <= 28) return 92;
  if (title.length <= 45) return 78;
  if (title.length <= 65) return 66;
  return 56;
}

/** Truncate on a word boundary so subtitles never end mid-word. */
export function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

/**
 * The card body. `eyebrow` renders as a mono terminal path in brand emerald,
 * matching the site hero and the `$ ls projects/` loaders.
 */
export function OgFrame({
  eyebrow,
  title,
  subtitle,
  footer,
  titleSize,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  footer?: string;
  /** Overrides the length-derived size. The site card sets its name larger. */
  titleSize?: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 88px",
        backgroundColor: ogColors.background,
        fontFamily: "Geist",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dotGrid()}
        width={OG_SIZE.width}
        height={OG_SIZE.height}
        style={{ position: "absolute", inset: 0 }}
        alt=""
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 28%, rgba(52,211,153,0.13) 0%, rgba(52,211,153,0) 45%)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontFamily: "Geist Mono",
          fontSize: 34,
          color: ogColors.brand,
        }}
      >
        {eyebrow}
        <div
          style={{
            width: 17,
            height: 38,
            marginLeft: 12,
            borderRadius: 3,
            backgroundColor: ogColors.brand,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 26,
          maxWidth: 1000,
          fontSize: titleSize ?? titleFontSize(title),
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: "-0.035em",
          color: ogColors.foreground,
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            marginTop: 22,
            maxWidth: 940,
            fontSize: 34,
            fontWeight: 400,
            lineHeight: 1.35,
            color: ogColors.muted,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      {footer ? (
        <div
          style={{
            position: "absolute",
            left: 88,
            bottom: 62,
            display: "flex",
            fontFamily: "Geist Mono",
            fontSize: 25,
            color: ogColors.subtle,
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** `a · b · c`, skipping anything empty. Satori has no `gap` on inline text. */
export function ogFooter(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join("  ·  ");
}
