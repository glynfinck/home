import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    "Supabase env missing. Run `supabase start` and populate .env.local " +
      "(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).",
  );
}

export const SUPABASE_URL = url;

const options = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

/** Anonymous (unauthenticated) client — sees exactly what a visitor sees. */
export const anonClient = (): SupabaseClient => createClient(url, anonKey, options);

/** Service-role client — bypasses RLS. Used only to arrange fixtures. */
export const adminClient = (): SupabaseClient =>
  createClient(url, serviceKey, options);

export const TEST_PASSWORD = "test-password-123";

/** A client authenticated as the given user. */
export async function signIn(email: string): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

/** Create a confirmed throwaway user; returns its id. */
export async function createUser(email: string, name: string): Promise<string> {
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user.id;
}
