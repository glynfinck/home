"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";

// Session-level guard so a post is counted once per tab (and React 19
// StrictMode double-effects don't double-count).
const counted = new Set<string>();

export function ViewTracker({ slug }: { slug: string }) {
  React.useEffect(() => {
    if (counted.has(slug)) return;
    counted.add(slug);

    const supabase = createClient();
    void supabase.rpc("increment_post_views", { post_slug: slug });
  }, [slug]);

  return null;
}
