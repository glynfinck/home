import { supabaseConfigured } from "@/lib/supabase/public";

/**
 * Runs a public data read, returning `fallback` when Supabase is unconfigured
 * or unreachable rather than throwing. This keeps a build — or a transient
 * outage — from hard-failing: pages render empty and fill in via ISR once data
 * is available. Wrap the cached call from the OUTSIDE so failures aren't
 * cached (the next request retries).
 */
export async function safeRead<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!supabaseConfigured) return fallback;
  try {
    return await run();
  } catch (err) {
    console.warn(
      `[data] ${label} unavailable — serving empty. ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return fallback;
  }
}
