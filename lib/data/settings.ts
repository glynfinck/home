import { unstable_cache } from "next/cache";

import { supabasePublic } from "@/lib/supabase/public";
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
  post: (slug: string) => `post:${slug}`,
  paper: (slug: string) => `paper:${slug}`,
} as const;

const getRawSettings = unstable_cache(
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
