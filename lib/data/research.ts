import { unstable_cache } from "next/cache";

import { supabasePublic } from "@/lib/supabase/public";
import { safeRead } from "@/lib/data/util";
import type { Tables } from "@/types/helpers";
import { CACHE_TAGS } from "@/lib/data/settings";

export type ResearchPaper = Tables<"research_papers">;
export type PostRef = Pick<
  Tables<"posts">,
  "id" | "slug" | "title" | "excerpt" | "published_at" | "reading_minutes"
>;

const getPublishedPapersCached = unstable_cache(
  async (): Promise<ResearchPaper[]> => {
    const { data, error } = await supabasePublic
      .from("research_papers")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) throw error;
    return data;
  },
  ["published-papers"],
  { tags: [CACHE_TAGS.research], revalidate: 3600 },
);

export const getPublishedPapers = (): Promise<ResearchPaper[]> =>
  safeRead("research", getPublishedPapersCached, []);

export function getPaperBySlug(slug: string): Promise<ResearchPaper | null> {
  return safeRead(
    `paper:${slug}`,
    unstable_cache(
      async (): Promise<ResearchPaper | null> => {
        const { data, error } = await supabasePublic
          .from("research_papers")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        return data;
      },
      ["paper", slug],
      { tags: [CACHE_TAGS.research, CACHE_TAGS.paper(slug)], revalidate: 3600 },
    ),
    null,
  );
}

/** Blog posts that reference a paper ("Discussed in"). */
export function getPostsForPaper(paperId: string): Promise<PostRef[]> {
  return safeRead(
    "paper-posts",
    unstable_cache(
      async (): Promise<PostRef[]> => {
        const { data, error } = await supabasePublic
          .from("post_papers")
          .select(
            "posts!inner(id, slug, title, excerpt, published_at, reading_minutes)",
          )
          .eq("paper_id", paperId);

        if (error) throw error;
        return data.map((row) => row.posts);
      },
      ["paper-posts", paperId],
      { tags: [CACHE_TAGS.posts, CACHE_TAGS.research], revalidate: 3600 },
    ),
    [],
  );
}
