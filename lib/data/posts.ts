import { unstable_cache } from "next/cache";

import { supabasePublic } from "@/lib/supabase/public";
import { safeRead } from "@/lib/data/util";
import type { Tables } from "@/types/helpers";
import { CACHE_TAGS } from "@/lib/data/settings";

export type Post = Tables<"posts">;
export type PostListItem = Omit<Post, "content">;
export type PaperRef = Pick<
  Tables<"research_papers">,
  "id" | "slug" | "title" | "abstract" | "topics" | "published_at"
>;

const LIST_COLUMNS =
  "id, slug, title, excerpt, cover_image_url, tags, tech_stack, status, published_at, reading_minutes, view_count, created_at, updated_at" as const;

const getPublishedPostsCached = unstable_cache(
  async (): Promise<PostListItem[]> => {
    const { data, error } = await supabasePublic
      .from("posts")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) throw error;
    return data;
  },
  ["published-posts"],
  { tags: [CACHE_TAGS.posts], revalidate: 3600 },
);

export const getPublishedPosts = (): Promise<PostListItem[]> =>
  safeRead("posts", getPublishedPostsCached, []);

export function getPostBySlug(slug: string): Promise<Post | null> {
  return safeRead(
    `post:${slug}`,
    unstable_cache(
      async (): Promise<Post | null> => {
        const { data, error } = await supabasePublic
          .from("posts")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        return data;
      },
      ["post", slug],
      { tags: [CACHE_TAGS.posts, CACHE_TAGS.post(slug)], revalidate: 3600 },
    ),
    null,
  );
}

/** Posts carrying `tag` as a topic or as a technology. */
export async function getPostsByTag(tag: string): Promise<PostListItem[]> {
  const posts = await getPublishedPosts();
  return posts.filter(
    (post) => post.tags.includes(tag) || post.tech_stack.includes(tag),
  );
}

export type TagCount = {
  tag: string;
  count: number;
  /** True for a technology (`posts.tech_stack`), false for a topic. */
  stack: boolean;
};

/**
 * Every topic and technology across published posts, most used first. Both
 * share the /blog/tag/[tag] pages; `stack` says which row a tag belongs in.
 */
export async function getAllTags(): Promise<TagCount[]> {
  const posts = await getPublishedPosts();
  const counts = new Map<string, TagCount>();
  const bump = (tag: string, stack: boolean) => {
    const entry = counts.get(tag) ?? { tag, count: 0, stack };
    entry.count += 1;
    entry.stack ||= stack;
    counts.set(tag, entry);
  };
  for (const post of posts) {
    for (const tag of post.tags) bump(tag, false);
    for (const tech of post.tech_stack) {
      if (!post.tags.includes(tech)) bump(tech, true);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

/**
 * Posts closest to `slug` by tag overlap, most similar first.
 *
 * Scored by Jaccard index so a post that shares 2 of its 3 tags ranks above
 * one that shares 2 of 12. Ties and zero-overlap fall back to recency, which
 * keeps the section populated on a site this small rather than hiding it.
 */
export async function getRelatedPosts(
  slug: string,
  limit = 3,
): Promise<PostListItem[]> {
  const posts = await getPublishedPosts();
  const current = posts.find((p) => p.slug === slug);
  if (!current) return [];

  const currentTags = new Set(current.tags);

  return posts
    .filter((p) => p.slug !== slug)
    .map((post) => {
      const shared = post.tags.filter((t) => currentTags.has(t)).length;
      const union = new Set([...currentTags, ...post.tags]).size;
      return { post, score: union === 0 ? 0 : shared / union };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.post.published_at ?? "") -
          Date.parse(a.post.published_at ?? ""),
    )
    .slice(0, limit)
    .map((entry) => entry.post);
}

/** Research papers referenced by a post ("Referenced research"). */
export function getPapersForPost(postId: string): Promise<PaperRef[]> {
  return safeRead(
    "post-papers",
    unstable_cache(
      async (): Promise<PaperRef[]> => {
        const { data, error } = await supabasePublic
          .from("post_papers")
          .select(
            "research_papers!inner(id, slug, title, abstract, topics, published_at)",
          )
          .eq("post_id", postId);

        if (error) throw error;
        return data.map((row) => row.research_papers);
      },
      ["post-papers", postId],
      { tags: [CACHE_TAGS.posts, CACHE_TAGS.research], revalidate: 3600 },
    ),
    [],
  );
}
