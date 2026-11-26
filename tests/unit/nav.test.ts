import { describe, expect, it } from "vitest";

import { breadcrumb, nearestSection, sharedSegments } from "@/lib/nav";

describe("breadcrumb", () => {
  it("is empty at the root", () => {
    expect(breadcrumb("/")).toEqual([]);
  });

  it("links every segment to the page it names", () => {
    expect(breadcrumb("/blog/some-post")).toEqual([
      { label: "blog", href: "/blog" },
      { label: "some-post", href: "/blog/some-post" },
    ]);
  });

  it("shows /blog/tag but does not link it, because it is not a page", () => {
    expect(breadcrumb("/blog/tag/quant").map((c) => c.href)).toEqual([
      "/blog",
      null,
      "/blog/tag/quant",
    ]);
  });

  it("decodes segments for display and survives a malformed escape", () => {
    expect(breadcrumb("/blog/tag/quant%20research").at(-1)?.label).toBe(
      "quant research",
    );
    expect(breadcrumb("/%E0%A4%A").at(-1)?.label).toBe("%E0%A4%A");
  });
});

describe("sharedSegments", () => {
  it("counts the common leading segments", () => {
    expect(sharedSegments("/blog", "/blog/post")).toBe(1);
    expect(sharedSegments("/blog/a", "/blog/b")).toBe(1);
    expect(sharedSegments("/projects", "/blog")).toBe(0);
    expect(sharedSegments("/", "/about")).toBe(0);
  });
});

describe("nearestSection", () => {
  it("suggests the section a typo was aiming at", () => {
    expect(nearestSection("/blgo")?.href).toBe("/blog");
    expect(nearestSection("/reserch")?.href).toBe("/research");
    expect(nearestSection("/Projetcs")?.href).toBe("/projects");
  });

  it("points a missing page back at its real section", () => {
    expect(nearestSection("/blog/no-such-post")?.href).toBe("/blog");
  });

  it("suggests nothing when no section is close", () => {
    expect(nearestSection("/pricing")).toBeNull();
    expect(nearestSection("/")).toBeNull();
  });
});
