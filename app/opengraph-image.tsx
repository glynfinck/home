import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getProfileSettings } from "@/lib/data/settings";

export const alt = "glyn.dev — Glyn Finck, software engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mirrors the home hero: zinc-950 bg, dot grid, emerald ~/glyn.dev prompt.
const colors = {
  background: "#09090b",
  foreground: "#fafafa",
  muted: "#a1a1aa",
  subtle: "#52525b",
  brand: "#34d399",
  dot: "#3f3f46",
};

// Satori doesn't tile gradient backgrounds, so the hero's dot grid is baked
// into an SVG, with the radial fade applied as per-dot opacity.
function dotGrid() {
  const spacing = 28;
  const focal = { x: 320, y: 250 };
  const reach = 720;
  let circles = "";
  for (let x = 14; x < size.width; x += spacing) {
    for (let y = 14; y < size.height; y += spacing) {
      const d = Math.hypot(x - focal.x, y - focal.y);
      const opacity = Math.max(0, 1 - d / reach) ** 1.5;
      if (opacity < 0.04) continue;
      circles += `<circle cx="${x}" cy="${y}" r="2" opacity="${opacity.toFixed(2)}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}"><g fill="${colors.dot}">${circles}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export default async function Image() {
  const [profile, geistSemiBold, geistRegular, geistMonoMedium] =
    await Promise.all([
      getProfileSettings(),
      readFile(join(process.cwd(), "assets/fonts/Geist-SemiBold.ttf")),
      readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf")),
      readFile(join(process.cwd(), "assets/fonts/GeistMono-Medium.ttf")),
    ]);

  const name = profile.name || "Glyn Finck";
  const headline = profile.headline || "Software engineer, learning in the open.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 88px",
          backgroundColor: colors.background,
          fontFamily: "Geist",
        }}
      >
        <img
          src={dotGrid()}
          width={size.width}
          height={size.height}
          style={{ position: "absolute", inset: 0 }}
          alt=""
        />
        {/* Soft emerald glow behind the prompt */}
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
            fontSize: 38,
            color: colors.brand,
          }}
        >
          ~/glyn.dev
          <div
            style={{
              width: 19,
              height: 42,
              marginLeft: 12,
              borderRadius: 3,
              backgroundColor: colors.brand,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 104,
            fontWeight: 600,
            letterSpacing: "-0.045em",
            color: colors.foreground,
          }}
        >
          {name}
        </div>

        <div
          style={{
            marginTop: 22,
            maxWidth: 900,
            fontSize: 42,
            fontWeight: 400,
            color: colors.muted,
          }}
        >
          {headline}
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            bottom: 62,
            display: "flex",
            fontFamily: "Geist Mono",
            fontSize: 26,
            color: colors.subtle,
          }}
        >
          projects&nbsp;&nbsp;·&nbsp;&nbsp;blog&nbsp;&nbsp;·&nbsp;&nbsp;research
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: geistSemiBold, style: "normal", weight: 600 },
        { name: "Geist", data: geistRegular, style: "normal", weight: 400 },
        {
          name: "Geist Mono",
          data: geistMonoMedium,
          style: "normal",
          weight: 500,
        },
      ],
    },
  );
}
