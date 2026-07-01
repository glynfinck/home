import { unstable_cache } from "next/cache";

import { supabasePublic } from "@/lib/supabase/public";
import type { Tables } from "@/types/helpers";
import { CACHE_TAGS } from "@/lib/data/settings";

export type Project = Tables<"projects">;

export const getPublishedProjects = unstable_cache(
  async (): Promise<Project[]> => {
    const { data, error } = await supabasePublic
      .from("projects")
      .select("*")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data;
  },
  ["published-projects"],
  { tags: [CACHE_TAGS.projects], revalidate: 3600 },
);

export async function getFeaturedProjects(limit = 3): Promise<Project[]> {
  const projects = await getPublishedProjects();
  return projects.filter((p) => p.featured).slice(0, limit);
}
