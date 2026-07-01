import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Admin assertion for server actions and admin pages. RLS is the
 * authoritative enforcement — this exists for early, clean failures.
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) throw new Error("Not authorized");

  return { supabase, user };
}
