import { describe, expect, it } from "vitest";

// Drives the production build over HTTP (server booted in global-setup).
const BASE = "http://localhost:3000";

describe("revalidate webhook auth", () => {
  it("401s without the shared secret", async () => {
    const res = await fetch(`${BASE}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ table: "posts" }),
    });
    expect(res.status).toBe(401);
  });

  it("401s with a wrong secret", async () => {
    const res = await fetch(`${BASE}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": "definitely-not-the-secret",
      },
      body: JSON.stringify({ table: "posts" }),
    });
    expect(res.status).toBe(401);
  });
});

// Admin-route RBAC across user types lives in rbac.test.ts.

describe("oauth callback", () => {
  it("redirects to the error state when no code is present", async () => {
    const res = await fetch(`${BASE}/auth/callback`, { redirect: "manual" });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toContain("auth_error=1");
  });

  it("rejects an off-site `next` redirect target (open-redirect guard)", async () => {
    const res = await fetch(
      `${BASE}/auth/callback?next=//evil.example.com`,
      { redirect: "manual" },
    );
    const location = res.headers.get("location") ?? "";
    // Sanitized back to the site root — never the protocol-relative target.
    expect(location).not.toContain("evil.example.com");
    expect(new URL(location).host).toBe(new URL(BASE).host);
  });
});

describe("feeds & discovery", () => {
  it("lists projects and research in the sitemap", async () => {
    const xml = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text());
    expect(xml).toContain("/projects");
    expect(xml).toContain("/research");
  });

  it("serves RSS with a channel title and item links", async () => {
    const xml = await fetch(`${BASE}/rss.xml`).then((r) => r.text());
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<link>");
  });
});
