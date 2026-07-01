import type { MetadataRoute } from "next";

import { getAllTags, getPublishedPosts } from "@/lib/data/posts";
import { getPublishedPapers } from "@/lib/data/research";
import { getSeoSettings } from "@/lib/data/settings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [seo, posts, papers, tags] = await Promise.all([
    getSeoSettings(),
    getPublishedPosts(),
    getPublishedPapers(),
    getAllTags(),
  ]);

  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? seo.url).replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/projects",
    "/blog",
    "/research",
    "/about",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...papers.map((paper) => ({
      url: `${base}/research/${paper.slug}`,
      lastModified: paper.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...tags.map(({ tag }) => ({
      url: `${base}/blog/tag/${encodeURIComponent(tag)}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
