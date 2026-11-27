import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildTagIconMap, resolveTagIcon, tagKey } from "@/lib/tag-icons";

describe("tagKey", () => {
  it("folds free-text tags to the kinds table's form", () => {
    expect(tagKey("C++")).toBe("cplusplus");
    expect(tagKey("Next.js")).toBe("nextjs");
    expect(tagKey("Tailwind CSS")).toBe("tailwindcss");
    expect(tagKey("shadcn/ui")).toBe("shadcnui");
  });
});

const kind = (
  name: string,
  icon_url: string,
  extra: { mono?: boolean; aliases?: string[] } = {},
) => ({ name, icon_url, mono: false, aliases: [], ...extra });

describe("resolveTagIcon", () => {
  it("matches a kind through tagKey", () => {
    const icons = buildTagIconMap([kind("c++", "https://cdn.example/cpp.svg")]);
    expect(resolveTagIcon("C++", icons)).toEqual({
      src: "https://cdn.example/cpp.svg",
      mono: false,
    });
  });

  it("matches aliases and keeps the mono flag", () => {
    const icons = buildTagIconMap([
      kind("kx", "kx.svg", { mono: true, aliases: ["kdb", "kdb+", "q"] }),
    ]);
    expect(resolveTagIcon("kdb+", icons)).toEqual({ src: "kx.svg", mono: true });
    expect(resolveTagIcon("Q", icons)?.src).toBe("kx.svg");
  });

  it("lets a kind's own name beat another kind's alias", () => {
    const icons = buildTagIconMap([
      kind("react", "react.svg", { aliases: ["next"] }),
      kind("next", "next.svg"),
    ]);
    expect(resolveTagIcon("next", icons)?.src).toBe("next.svg");
  });

  it("returns null without a kind", () => {
    expect(resolveTagIcon("quant", buildTagIconMap([]))).toBeNull();
    expect(resolveTagIcon("python", undefined)).toBeNull();
  });
});

/**
 * The kinds the logo migration inserts, read from the SQL itself, so the
 * seeded technologies are checked against what actually ships.
 */
function migrationKinds() {
  const sql = readFileSync(
    path.join("supabase/migrations/20261127160000_tag_kind_logos.sql"),
    "utf8",
  );
  const row =
    /^ {2}\('([^']+)', '(data:image\/svg\+xml;base64,[^']+)', (true|false), array\[([^\]]*)\]::text\[\]\)/gm;
  return [...sql.matchAll(row)].map((m) => ({
    name: m[1],
    icon_url: m[2],
    mono: m[3] === "true",
    aliases: [...m[4].matchAll(/'([^']+)'/g)].map((a) => a[1]),
  }));
}

describe("built-in logos migration", () => {
  const kinds = migrationKinds();
  const icons = buildTagIconMap(kinds);

  it("ships every logo as a valid inline SVG", () => {
    expect(kinds).toHaveLength(25);
    for (const k of kinds) {
      const svg = Buffer.from(k.icon_url.split(",")[1], "base64").toString();
      expect(svg, k.name).toMatch(/^<svg[\s>]/);
      expect(tagKey(k.name), k.name).toBe(k.name);
    }
  });

  it("covers every technology in use", () => {
    for (const tag of [
      "Arduino",
      "C++",
      "Claude",
      "Expo",
      "kdb",
      "MATLAB",
      "MCP",
      "MDX",
      "Next.js",
      "NVIDIA Jetson",
      "Pixi.js",
      "Playwright",
      "PWA",
      "Pyodide",
      "Python",
      "React Native",
      "ROS",
      "shadcn/ui",
      "Stripe",
      "Supabase",
      "Tailwind CSS",
      "TypeScript",
      "Unreal Engine 4",
      "Vercel",
      "YOLOv3",
    ]) {
      expect(resolveTagIcon(tag, icons), tag).not.toBeNull();
    }
    expect(resolveTagIcon("kdb", icons)?.mono).toBe(true);
  });

  it("leaves topics plain", () => {
    for (const topic of ["quant", "research", "ai", "statarb", "Robotics"]) {
      expect(resolveTagIcon(topic, icons), topic).toBeNull();
    }
  });
});
