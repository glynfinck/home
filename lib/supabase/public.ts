import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether the public Supabase env is configured. False during a build with no
 * credentials (e.g. a Vercel *preview* deployment, which doesn't receive
 * Production env vars) — the data layer then serves empty instead of crashing
 * the build. See lib/data/util.ts.
 */
export const supabaseConfigured = Boolean(url && anonKey);

/**
 * Cookie-free anon client for cached public reads.
 *
 * `unstable_cache` forbids reading cookies inside the cached scope, so the
 * data layer (lib/data/*) must not use the cookie-bound server client. All
 * queries made with this client see exactly what an anonymous visitor sees
 * (RLS anon policies).
 *
 * Falls back to a harmless placeholder when env is absent so the module can
 * still be imported during a credential-less build; reads are guarded by
 * `safeRead`, which short-circuits to empty when `supabaseConfigured` is false.
 */
export const supabasePublic = createClient<Database>(
  url ?? "http://127.0.0.1:54321",
  anonKey ?? "public-anon-placeholder",
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // unstable_cache is the single caching layer. Without this, Next's
      // patched fetch can cache the inner REST call itself, so tag
      // revalidation would re-run the callback only to re-read a stale
      // fetch-cache entry.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  },
);
