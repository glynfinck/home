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
    // `.rpc()` returns a lazy thenable, not a promise: postgrest-js only
    // issues the request inside `then()`. Dropping the builder on the floor
    // (`void supabase.rpc(...)`) silently sends nothing — which is how every
    // post sat at zero views. Keep the `.then()`.
    void supabase
      .rpc("increment_post_views", { post_slug: slug })
      .then(({ error }) => {
        if (error) console.warn("view tracking failed", error.message);
      });
  }, [slug]);

  return null;
}
