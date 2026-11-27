import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveTagIcon, tagKey } from "@/lib/tag-icons";

describe("tagKey", () => {
  it("folds free-text tags to the kinds table's form", () => {
    expect(tagKey("C++")).toBe("cplusplus");
    expect(tagKey("Next.js")).toBe("nextjs");
    expect(tagKey("Tailwind CSS")).toBe("tailwindcss");
    expect(tagKey("shadcn/ui")).toBe("shadcnui");
  });
});

describe("resolveTagIcon", () => {
  it("prefers an uploaded kind, matched through tagKey", () => {
    const uploaded = { cplusplus: "https://cdn.example/cpp.svg" };
    expect(resolveTagIcon("C++", uploaded)).toEqual({
      src: "https://cdn.example/cpp.svg",
      mono: false,
    });
  });

  it("falls back to the built-in logo, through aliases", () => {
    expect(resolveTagIcon("React Native")?.src).toBe("/tag-icons/react.svg");
    expect(resolveTagIcon("NVIDIA Jetson")?.src).toBe("/tag-icons/nvidia.svg");
    expect(resolveTagIcon("kdb")).toEqual({
      src: "/tag-icons/kx.svg",
      mono: true,
    });
  });

  it("leaves topics without a logo plain", () => {
    for (const topic of [
      "quant",
      "research",
      "ai",
      "statarb",
      "Robotics",
      "SLAM",
    ]) {
      expect(resolveTagIcon(topic)).toBeNull();
    }
  });

  it("has a file for every built-in logo in use", () => {
    const tags = [
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
      "React",
      "ROS",
      "shadcn/ui",
      "Stripe",
      "Supabase",
      "Tailwind CSS",
      "TypeScript",
      "Unreal Engine 4",
      "Vercel",
      "YOLOv3",
    ];
    for (const tag of tags) {
      const icon = resolveTagIcon(tag);
      expect(icon, tag).not.toBeNull();
      expect(existsSync(path.join("public", icon!.src)), tag).toBe(true);
    }
  });
});
