import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Cookie-free anon client for cached public reads.
 *
 * `unstable_cache` forbids reading cookies inside the cached scope, so the
 * data layer (lib/data/*) must not use the cookie-bound server client. All
 * queries made with this client see exactly what an anonymous visitor sees
 * (RLS anon policies).
 */
export const supabasePublic = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // unstable_cache is the single caching layer. Without this, Next's
      // patched fetch can cache the inner REST call itself, so tag
      // revalidation would re-run the callback only to re-read a stale
      // fetch-cache entry.
      fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }),
    },
  },
);
