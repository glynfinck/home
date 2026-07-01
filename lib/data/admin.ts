import "server-only";

import { unstable_noStore } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/helpers";

/**
 * Admin reads — always fresh, always under the admin's cookie session
 * (admin RLS policies expose drafts and hidden comments).
 */

export async function adminListPosts() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, slug, title, status, published_at, view_count, updated_at, tags",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminGetPost(id: string) {
  unstable_noStore();
  const supabase = await createClient();
  const [{ data: post, error }, { data: links, error: linksError }] =
    await Promise.all([
      supabase.from("posts").select("*").eq("id", id).maybeSingle(),
      supabase.from("post_papers").select("paper_id").eq("post_id", id),
    ]);
  if (error) throw error;
  if (linksError) throw linksError;
  return post
    ? { ...post, paperIds: (links ?? []).map((l) => l.paper_id) }
    : null;
}

export async function adminListProjects() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, title, status, featured, sort_order, updated_at")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function adminGetProject(id: string) {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminListPapers() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_papers")
    .select("id, slug, title, status, published_at, download_count, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminGetPaper(id: string) {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_papers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type AdminComment = Tables<"comments"> & {
  profiles: Pick<Tables<"profiles">, "display_name" | "avatar_url"> | null;
  posts: Pick<Tables<"posts">, "slug" | "title"> | null;
};

export async function adminListComments() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles(display_name, avatar_url), posts(slug, title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as AdminComment[];
}

export async function adminGetSettings() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("*");
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

export async function adminGetStats() {
  unstable_noStore();
  const supabase = await createClient();

  const [posts, papers, comments, downloads] = await Promise.all([
    supabase.from("posts").select("status, view_count"),
    supabase.from("research_papers").select("status, download_count"),
    supabase.from("comments").select("status", { count: "exact", head: true }),
    supabase
      .from("paper_downloads")
      .select("id", { count: "exact", head: true }),
  ]);

  const totalViews = (posts.data ?? []).reduce(
    (sum, p) => sum + (p.view_count ?? 0),
    0,
  );
  const publishedPosts = (posts.data ?? []).filter(
    (p) => p.status === "published",
  ).length;

  return {
    posts: posts.data?.length ?? 0,
    publishedPosts,
    totalViews,
    papers: papers.data?.length ?? 0,
    totalDownloads: downloads.count ?? 0,
    comments: comments.count ?? 0,
  };
}
