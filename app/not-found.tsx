import { CommandPalette } from "@/components/site/command-palette";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { NotFoundContent } from "@/components/site/not-found-content";
import { getProfileSettings, getSocialLinks } from "@/lib/data/settings";

/**
 * 404 for URLs that match no route.
 *
 * These never enter the `(site)` group, so its layout does not wrap them and
 * the page used to render with no navbar or footer: a dead end with a single
 * button. It mirrors `app/(site)/layout.tsx` so a mistyped URL lands on the
 * same page as a missing post.
 */
export default async function RootNotFound() {
  const [profile, socialLinks] = await Promise.all([
    getProfileSettings(),
    getSocialLinks(),
  ]);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <NotFoundContent />
      </main>
      <Footer
        name={profile.name}
        socialLinks={socialLinks}
        location={profile.location}
        timezone={profile.timezone}
      />
      <CommandPalette email={profile.email ?? undefined} />
    </>
  );
}
