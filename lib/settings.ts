import { z } from "zod";

/** Typed shapes for the jsonb values in `site_settings`. */

export const profileSettingsSchema = z.object({
  name: z.string().default("Glyn Finck"),
  headline: z.string().default(""),
  // Short hero subtext (plain text).
  bio: z.string().default(""),
  // Long-form About page body, rendered as MDX. Falls back to `bio` if empty.
  about: z.string().default(""),
  location: z.string().default(""),
  email: z.string().default(""),
  resume_url: z.string().default(""),
});
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;

export const socialLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
  icon: z.string().optional(),
});
export const socialLinksSchema = z.array(socialLinkSchema).default([]);
export type SocialLink = z.infer<typeof socialLinkSchema>;

export const seoSettingsSchema = z.object({
  title_template: z.string().default("%s · glyn.dev"),
  default_title: z.string().default("glyn.dev"),
  description: z.string().default(""),
  url: z.string().default("https://glyn.dev"),
});
export type SeoSettings = z.infer<typeof seoSettingsSchema>;

export const SETTINGS_KEYS = {
  profile: profileSettingsSchema,
  social_links: socialLinksSchema,
  seo: seoSettingsSchema,
} as const;
