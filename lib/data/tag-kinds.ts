import { unstable_cache } from "next/cache";

import { supabasePublic } from "@/lib/supabase/public";
import { safeRead } from "@/lib/data/util";
import type { Tables } from "@/types/helpers";
import { CACHE_TAGS } from "@/lib/data/settings";
import { tagKey } from "@/lib/tag-icons";

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
 * Kind name, folded by `tagKey` → icon URL. Look tags up through
 * `resolveTagIcon`, which folds them the same way, so "C++" finds the
 * "cplusplus" kind and "Next.js" finds "nextjs".
 */
export async function getTagIconMap(): Promise<Record<string, string>> {
  const kinds = await getTagKinds();
  return Object.fromEntries(
    kinds.map((kind) => [tagKey(kind.name), kind.icon_url]),
  );
}
