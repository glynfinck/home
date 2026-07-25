import { ImageResponse } from "next/og";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  loadOgFonts,
  ogFooter,
} from "@/lib/og";
import { getProfileSettings } from "@/lib/data/settings";

export const alt = "glyn.dev — Glyn Finck, software engineer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const [profile, fonts] = await Promise.all([
    getProfileSettings(),
    loadOgFonts(),
  ]);

  return new ImageResponse(
    (
      <OgFrame
        eyebrow="~/glyn.dev"
        title={profile.name || "Glyn Finck"}
        titleSize={104}
        subtitle={
          profile.headline || "Software engineer, learning in the open."
        }
        footer={ogFooter("projects", "blog", "research")}
      />
    ),
    { ...size, fonts },
  );
}
