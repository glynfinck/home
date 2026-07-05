import { createServerClient } from "@supabase/ssr";
import { beforeAll, describe, expect, it } from "vitest";

import {
  SUPABASE_URL,
  TEST_PASSWORD,
  adminClient,
  createUser,
} from "../helpers/supabase";

// Route-level RBAC matrix over real HTTP. Three guard layers back the admin
// surface (see proxy.ts, app/admin/layout.tsx, lib/actions/guard.ts):
//   - anon      => proxy redirects /admin/* to "/" (no session)
//   - non-admin => admin layout redirects pages to "/"; requireAdmin => 401 API
//   - admin     => 200
// RLS (the authoritative data-layer enforcement) is covered separately in the
// integration suite; this asserts the request never reaches a handler it must not.

const BASE = "http://localhost:3000";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const REDIRECTS = [301, 302, 303, 307, 308];

/**
 * Sign in with the same @supabase/ssr client the app uses and capture the
 * cookies it writes, so the Cookie header we send back is exactly what the
 * server reads — no hardcoded cookie name, chunking, or encoding assumptions.
 */
async function sessionCookie(email: string): Promise<string> {
  const jar: Record<string, string> = {};
  const client = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () =>
        Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (list) =>
        list.forEach(({ name, value }) => {
          jar[name] = value;
        }),
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return Object.entries(jar)
    .map(([n, v]) => `${n}=${v}`)
    .join("; ");
}

type Role = "anon" | "user" | "admin";
const cookies: Record<Role, string | undefined> = {
  anon: undefined,
  user: undefined,
  admin: undefined,
};

const stamp = Date.now();
const email = {
  user: `rbac-user-${stamp}@ci.test`,
  admin: `rbac-admin-${stamp}@ci.test`,
};

beforeAll(async () => {
  await createUser(email.user, "RBAC User");
  const adminId = await createUser(email.admin, "RBAC Admin");
  await adminClient().from("profiles").update({ is_admin: true }).eq("id", adminId);
  cookies.user = await sessionCookie(email.user);
  cookies.admin = await sessionCookie(email.admin);
});

function req(path: string, role: Role, init: RequestInit = {}) {
  const cookie = cookies[role];
  return fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: { ...(init.headers ?? {}), ...(cookie ? { cookie } : {}) },
  });
}

const redirectsToHome = (res: Response) => {
  expect(REDIRECTS).toContain(res.status);
  expect(new URL(res.headers.get("location") ?? "", BASE).pathname).toBe("/");
};

// Every non-parameterized admin page. They share one layout guard, so the
// matrix over all of them proves the guard is applied uniformly.
const ADMIN_PAGES = [
  "/admin",
  "/admin/comments",
  "/admin/kinds",
  "/admin/media",
  "/admin/posts",
  "/admin/posts/new",
  "/admin/projects",
  "/admin/projects/new",
  "/admin/research",
  "/admin/research/new",
  "/admin/settings",
];

describe("admin pages RBAC", () => {
  for (const path of ADMIN_PAGES) {
    it(`${path} — anon is redirected home`, async () => {
      redirectsToHome(await req(path, "anon"));
    });
    it(`${path} — non-admin is redirected home`, async () => {
      redirectsToHome(await req(path, "user"));
    });
    it(`${path} — admin gets 200`, async () => {
      expect((await req(path, "admin")).status).toBe(200);
    });
  }
});

describe("admin mdx-preview route RBAC", () => {
  const post = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: "# Heading" }),
  };

  it("anon is redirected home by the proxy", async () => {
    redirectsToHome(await req("/admin/mdx-preview", "anon", post));
  });

  it("non-admin gets 401 from requireAdmin", async () => {
    expect((await req("/admin/mdx-preview", "user", post)).status).toBe(401);
  });

  it("admin gets 200 with compiled HTML", async () => {
    const res = await req("/admin/mdx-preview", "admin", post);
    expect(res.status).toBe(200);
    expect((await res.json()).html).toContain("<h1");
  });

  it("admin gets 400 when source is missing", async () => {
    const res = await req("/admin/mdx-preview", "admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
