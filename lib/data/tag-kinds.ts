import { unstable_cache } from "next/cache";

import { supabasePublic } from "@/lib/supabase/public";
import { safeRead } from "@/lib/data/util";
import type { Tables } from "@/types/helpers";
import { CACHE_TAGS } from "@/lib/data/settings";
import { buildTagIconMap, type TagIconMap } from "@/lib/tag-icons";

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
 * Icons by `tagKey` for every kind name and alias. Look tags up through
 * `resolveTagIcon`, which folds them the same way, so "C++" finds the
 * "cplusplus" kind and "kdb" finds kx through its alias.
 */
export async function getTagIconMap(): Promise<TagIconMap> {
  return buildTagIconMap(await getTagKinds());
}
