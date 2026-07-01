import {
  ProfileSettingsForm,
  SeoSettingsForm,
  SocialLinksForm,
} from "@/components/admin/settings-form";
import { adminGetSettings } from "@/lib/data/admin";
import {
  profileSettingsSchema,
  seoSettingsSchema,
  socialLinksSchema,
} from "@/lib/settings";

export default async function AdminSettingsPage() {
  const settings = await adminGetSettings();

  const profile = profileSettingsSchema.parse(settings.profile ?? {});
  const socialLinks = socialLinksSchema.parse(settings.social_links ?? []);
  const seo = seoSettingsSchema.parse(settings.seo ?? {});

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything here is data-driven — saves go live without a redeploy.
      </p>
      <div className="mt-6 space-y-6">
        <ProfileSettingsForm initial={profile} />
        <SocialLinksForm initial={socialLinks} />
        <SeoSettingsForm initial={seo} />
      </div>
    </div>
  );
}
