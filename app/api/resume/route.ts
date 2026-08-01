import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getProfileSettings } from "@/lib/data/settings";
import { downloadContext } from "@/lib/download-context";
import { createClient } from "@/lib/supabase/server";

/**
 * Tracked resume downloads.
 *
 * The resume PDF itself is public (it lives in the `media` bucket), so this
 * route adds no access control — it exists purely so the click is recorded
 * before the redirect. Linking the bucket URL directly, as the buttons used
 * to, meant the request never reached the app and nothing was ever counted.
 */
export async function GET() {
  const { resume_url: resumeUrl } = await getProfileSettings();

  // No resume uploaded yet: the buttons are hidden in that case, so this is
  // only reachable by hand.
  if (!resumeUrl) {
    return NextResponse.json({ error: "No resume available" }, { status: 404 });
  }

  const supabase = await createClient();
  const { referrer, country } = downloadContext(await headers());
  await supabase.rpc("log_resume_download", {
    p_referrer: referrer,
    p_country: country,
  });

  return NextResponse.redirect(resumeUrl, 302);
}
