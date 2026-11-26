import { z } from "zod";

/** Typed shapes for the jsonb values in `site_settings`. */

/** One line of the About page's `whoami` block: `based  London, England`. */
export const profileFactSchema = z.object({
  key: z.string().trim().min(1).max(16),
  value: z.string().trim().min(1).max(160),
});
export type ProfileFact = z.infer<typeof profileFactSchema>;

/** One stop on the About page's timeline, newest first. */
export const timelineEntrySchema = z.object({
  when: z.string().trim().min(1).max(32),
  text: z.string().trim().min(1).max(280),
});
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

export const profileSettingsSchema = z.object({
  name: z.string().default("Glyn Finck"),
  headline: z.string().default(""),
  // Short hero subtext (plain text).
  bio: z.string().default(""),
  // Long-form About page body, rendered as MDX. Falls back to `bio` if empty.
  about: z.string().default(""),
  location: z.string().default(""),
  // IANA zone for the footer clock ("London 14:32"). The clock is labelled
  // with the first part of `location`.
  timezone: z.string().default("Europe/London"),
  email: z.string().default(""),
  resume_url: z.string().default(""),
  // The About page's `whoami` block. Empty falls back to name, location and
  // email, so the block is never blank.
  facts: z.array(profileFactSchema).max(10).default([]),
  // The About page's timeline, newest first. Hidden when empty.
  timeline: z.array(timelineEntrySchema).max(12).default([]),
});
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;

/**
 * The facts to show: the configured ones, or a default built from the fields
 * the profile already has.
 */
export function profileFacts(profile: ProfileSettings): ProfileFact[] {
  if (profile.facts.length > 0) return profile.facts;
  return [
    { key: "name", value: profile.name },
    { key: "based", value: profile.location },
    { key: "contact", value: profile.email },
  ].filter((fact) => fact.value);
}

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
