import { describe, expect, it } from "vitest";

// Drives the production build over HTTP (server booted in global-setup).
const BASE = "http://localhost:3000";
const get = (path: string) => fetch(`${BASE}${path}`);
const text = (path: string) => get(path).then((r) => r.text());

describe("public pages", () => {
  it("renders the home hero from site settings", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Software engineer");
  });

  it("lists published posts and hides drafts", async () => {
    const html = await text("/blog");
    expect(html).toContain("momentum-signal-decay");
    expect(html).not.toContain("draft-example");
  });
});

describe("MDX pipeline", () => {
  it("renders KaTeX, highlighted code, and referenced research", async () => {
    const html = await text("/blog/momentum-signal-decay");
    expect(html).toContain("katex");
    expect(html).toContain("data-rehype-pretty-code-figure");
    expect(html).toContain("Referenced research");
  });
});

describe("secure downloads", () => {
  it("302-redirects a published paper to a signed URL", async () => {
    const res = await fetch(`${BASE}/api/download/momentum-decay-crypto`, {
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/storage/v1/object/sign/");
  });

  it("serves PDF bytes when the redirect is followed", async () => {
    const res = await get("/api/download/momentum-decay-crypto");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("404s an unpublished paper", async () => {
    expect((await get("/api/download/draft-paper")).status).toBe(404);
  });
});

describe("status codes & SEO", () => {
  it("returns 404 for an unknown post", async () => {
    expect((await get("/blog/does-not-exist")).status).toBe(404);
  });

  it("blocks /admin in robots.txt", async () => {
    expect(await text("/robots.txt")).toContain("Disallow: /admin");
  });

  it("includes posts in the sitemap", async () => {
    expect(await text("/sitemap.xml")).toContain("blog/momentum-signal-decay");
  });

  it("exposes an RSS feed with items", async () => {
    expect(await text("/rss.xml")).toContain("<item>");
  });
});
