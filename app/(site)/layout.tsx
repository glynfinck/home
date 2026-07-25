import { CommandPalette } from "@/components/site/command-palette";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { getProfileSettings, getSocialLinks } from "@/lib/data/settings";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [profile, socialLinks] = await Promise.all([
    getProfileSettings(),
    getSocialLinks(),
  ]);

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer name={profile.name} socialLinks={socialLinks} />
      {/* Mounted once for the whole site; it loads its index lazily on the
          first open, so this costs nothing on pages nobody searches from. */}
      <CommandPalette email={profile.email ?? undefined} />
    </>
  );
}
