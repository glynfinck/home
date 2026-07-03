import { unstable_cache } from "next/cache";

import { supabasePublic } from "@/lib/supabase/public";
import { safeRead } from "@/lib/data/util";
import type { Tables } from "@/types/helpers";
import { CACHE_TAGS } from "@/lib/data/settings";

export type TagKind = Tables<"tag_kinds">;

const getTagKindsCached = unstable_cache(
  async (): Promise<TagKind[]> => {
    const { data, error } = await supabasePublic
      .from("tag_kinds")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  },
  ["tag-kinds"],
  { tags: [CACHE_TAGS.tagKinds], revalidate: 3600 },
);

export const getTagKinds = (): Promise<TagKind[]> =>
  safeRead("tag_kinds", getTagKindsCached, []);

/**
 * Lowercased kind name → icon URL. Tags match kinds case-insensitively, so
 * look up with `tag.toLowerCase()`.
 */
export async function getTagIconMap(): Promise<Record<string, string>> {
  const kinds = await getTagKinds();
  return Object.fromEntries(
    kinds.map((kind) => [kind.name.toLowerCase(), kind.icon_url]),
  );
}
