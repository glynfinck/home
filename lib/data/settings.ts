import { unstable_cache } from "next/cache";

import { supabasePublic } from "@/lib/supabase/public";
import { safeRead } from "@/lib/data/util";
import {
  profileSettingsSchema,
  seoSettingsSchema,
  socialLinksSchema,
  type ProfileSettings,
  type SeoSettings,
  type SocialLink,
} from "@/lib/settings";

export const CACHE_TAGS = {
  settings: "settings",
  projects: "projects",
  posts: "posts",
  research: "research",
  tagKinds: "tag-kinds",
  post: (slug: string) => `post:${slug}`,
  paper: (slug: string) => `paper:${slug}`,
  project: (slug: string) => `project:${slug}`,
} as const;

const getRawSettingsCached = unstable_cache(
  async (): Promise<Record<string, unknown>> => {
    const { data, error } = await supabasePublic
      .from("site_settings")
      .select("key, value");

    if (error) throw error;

    return Object.fromEntries(data.map((row) => [row.key, row.value]));
  },
  ["site-settings"],
  { tags: [CACHE_TAGS.settings], revalidate: 3600 },
);

const getRawSettings = () =>
  safeRead("site_settings", getRawSettingsCached, {} as Record<string, unknown>);

export async function getProfileSettings(): Promise<ProfileSettings> {
  const settings = await getRawSettings();
  const parsed = profileSettingsSchema.safeParse(settings.profile ?? {});
  return parsed.success ? parsed.data : profileSettingsSchema.parse({});
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  const settings = await getRawSettings();
  const parsed = socialLinksSchema.safeParse(settings.social_links ?? []);
  return parsed.success ? parsed.data : [];
}

export async function getSeoSettings(): Promise<SeoSettings> {
  const settings = await getRawSettings();
  const parsed = seoSettingsSchema.safeParse(settings.seo ?? {});
  return parsed.success ? parsed.data : seoSettingsSchema.parse({});
}
