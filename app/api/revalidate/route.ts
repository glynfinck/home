import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { CACHE_TAGS } from "@/lib/data/settings";

/**
 * Cache revalidation webhook.
 *
 * Primary revalidation happens inline in admin server actions; this endpoint
 * is the backup path so edits made directly in Supabase Studio also go live.
 * Point a Supabase Database Webhook (INSERT/UPDATE/DELETE on the content
 * tables) at POST /api/revalidate with an `x-revalidate-secret` header.
 */

const TABLE_TAGS: Record<string, string[]> = {
  site_settings: [CACHE_TAGS.settings],
  projects: [CACHE_TAGS.projects],
  posts: [CACHE_TAGS.posts],
  research_papers: [CACHE_TAGS.research],
  post_papers: [CACHE_TAGS.posts, CACHE_TAGS.research],
  tag_kinds: [CACHE_TAGS.tagKinds],
};

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    table?: string;
    record?: { slug?: string };
    old_record?: { slug?: string };
  };

  const tags = new Set<string>(
    body.table
      ? (TABLE_TAGS[body.table] ?? [])
      : Object.values(TABLE_TAGS).flat(),
  );

  // Per-slug tags so a single post/paper edit doesn't refetch whole lists
  for (const slug of [body.record?.slug, body.old_record?.slug]) {
    if (!slug) continue;
    if (body.table === "posts") tags.add(CACHE_TAGS.post(slug));
    if (body.table === "research_papers") tags.add(CACHE_TAGS.paper(slug));
    if (body.table === "projects") tags.add(CACHE_TAGS.project(slug));
  }

  // { expire: 0 } = immediate hard expiry — the very next request refetches.
  // ("max" would be stale-while-revalidate: one request behind.)
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  return NextResponse.json({ revalidated: [...tags] });
}
