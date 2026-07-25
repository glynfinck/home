import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/data/settings";
import { getAllTags, getPublishedPosts } from "@/lib/data/posts";
import { getPublishedProjects } from "@/lib/data/projects";
import { getPublishedPapers } from "@/lib/data/research";
import { safeRead } from "@/lib/data/util";

export type SearchGroup = "Posts" | "Research" | "Projects" | "Tags";

export type SearchItem = {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle?: string;
  href: string;
  /** Extra match terms (tags, slug, tech stack) fed to cmdk's scorer. */
  keywords: string[];
};

/**
 * Flat index behind the command palette.
 *
 * Built from the same cached readers the pages use and tagged with the same
 * cache tags, so `/api/revalidate` invalidates it alongside everything else
 * with no extra wiring. At this content volume a full in-memory index is a few
 * KB, which is why there is no search service here.
 */
const getSearchIndexCached = unstable_cache(
  async (): Promise<SearchItem[]> => {
    const [posts, papers, projects, tags] = await Promise.all([
      getPublishedPosts(),
      getPublishedPapers(),
      getPublishedProjects(),
      getAllTags(),
    ]);

    return [
      ...posts.map((post) => ({
        id: `post:${post.slug}`,
        group: "Posts" as const,
        title: post.title,
        subtitle: post.excerpt ?? undefined,
        href: `/blog/${post.slug}`,
        keywords: [post.slug, ...post.tags],
      })),
      ...papers.map((paper) => ({
        id: `paper:${paper.slug}`,
        group: "Research" as const,
        title: paper.title,
        subtitle: paper.abstract ?? undefined,
        href: `/research/${paper.slug}`,
        keywords: [paper.slug, ...paper.topics, "pdf", "paper"],
      })),
      ...projects.map((project) => ({
        id: `project:${project.slug}`,
        group: "Projects" as const,
        title: project.title,
        subtitle: project.summary ?? undefined,
        href: `/projects/${project.slug}`,
        keywords: [project.slug, ...project.tech_stack],
      })),
      ...tags.map(({ tag, count }) => ({
        id: `tag:${tag}`,
        group: "Tags" as const,
        title: tag,
        subtitle: `${count} ${count === 1 ? "post" : "posts"}`,
        href: `/blog/tag/${encodeURIComponent(tag)}`,
        keywords: ["tag", tag],
      })),
    ];
  },
  ["search-index"],
  {
    tags: [CACHE_TAGS.posts, CACHE_TAGS.research, CACHE_TAGS.projects],
    revalidate: 3600,
  },
);

export const getSearchIndex = (): Promise<SearchItem[]> =>
  safeRead("search-index", getSearchIndexCached, []);
