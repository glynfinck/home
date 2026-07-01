import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Secure research-PDF downloads.
 *
 * Papers are free for everyone (no login), but the bucket is private: the
 * stored path grants nothing on its own. This route looks up the published
 * paper under the caller's RLS, logs the download (attributed to the user
 * when signed in), then 302-redirects to a 60-second signed URL minted with
 * the service-role client.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Caller's client: RLS guarantees only published papers resolve
  const supabase = await createClient();
  const { data: paper } = await supabase
    .from("research_papers")
    .select("slug, pdf_path")
    .eq("slug", slug)
    .maybeSingle();

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  // Attributes user_id via auth.uid() when a session exists
  await supabase.rpc("log_paper_download", { paper_slug: paper.slug });

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("research")
    .createSignedUrl(paper.pdf_path, 60, { download: `${paper.slug}.pdf` });

  if (error || !signed) {
    return NextResponse.json(
      { error: "File temporarily unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
