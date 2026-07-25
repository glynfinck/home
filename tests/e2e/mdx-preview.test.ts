import { createServerClient } from "@supabase/ssr";
import { beforeAll, describe, expect, it } from "vitest";

import {
  SUPABASE_URL,
  TEST_PASSWORD,
  adminClient,
  createUser,
} from "../helpers/supabase";

/**
 * The admin live preview compiles draft MDX with `renderToStaticMarkup`, which
 * cannot invoke client components. Every component registered in
 * `lib/mdx.tsx` therefore needs a server-safe stand-in in
 * `components/admin/preview-components.tsx`.
 *
 * Forgetting one does not fail a build or a type check — it throws at request
 * time, so the editor's preview pane just stops working. This is the guard.
 */

const BASE = "http://localhost:3000";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  return Object.entries(jar)
    .map(([n, v]) => `${n}=${v}`)
    .join("; ");
}

let cookie: string;

beforeAll(async () => {
  const email = `mdx-admin-${Date.now()}@ci.test`;
  const id = await createUser(email, "MDX Admin");
  await adminClient().from("profiles").update({ is_admin: true }).eq("id", id);
  cookie = await sessionCookie(email);
});

function preview(source: string) {
  return fetch(`${BASE}/admin/mdx-preview`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ source }),
  });
}

describe("admin MDX preview", () => {
  it("renders every registered MDX component without throwing", async () => {
    const source = [
      "# Heading",
      "",
      "Prose with a note.<Sidenote>A margin note.</Sidenote>",
      "",
      '<Callout type="tip">A tip.</Callout>',
      "",
      '<Chart src="/figures/pairs-equity.json" />',
      "",
      '<Figure src="/x.png" alt="x" width={320} />',
      "",
      '<PaperCard slug="ou-pairs-limits-of-arbitrage" />',
      "",
      "```python title=\"x.py\" {1}",
      "x = 1",
      "```",
      "",
      "$$x^2$$",
    ].join("\n");

    const res = await preview(source);
    expect(res.status).toBe(200);

    const { html } = (await res.json()) as { html: string };
    expect(html).toContain("sidenote");
    expect(html).toContain("Chart"); // the ChartPreview placeholder
    expect(html).toContain("data-rehype-pretty-code-figure");
    expect(html).toContain("katex");
  });

  it("keeps numeric JSX props (blockJS must stay false)", async () => {
    const res = await preview('<Figure src="/x.png" alt="x" width={320} />');
    const { html } = (await res.json()) as { html: string };
    // next-mdx-remote v6 silently strips expression attributes when blockJS
    // is on, so the width would vanish with no error.
    expect(html).toContain("320px");
  });

  it("reports compile errors instead of 500ing", async () => {
    const res = await preview("<Unclosed>");
    expect(res.status).toBe(422);
  });

  // Anon never reaches `requireAdmin`: proxy.ts redirects /admin/* away first,
  // so the 401 path only applies to a signed-in non-admin (covered in
  // rbac.test.ts). Asserting the redirect keeps this honest about which of the
  // three guard layers actually fires.
  it("redirects an unauthenticated request before the handler runs", async () => {
    const res = await fetch(`${BASE}/admin/mdx-preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "hi" }),
      redirect: "manual",
    });
    expect([301, 302, 303, 307, 308]).toContain(res.status);
    expect(new URL(res.headers.get("location") ?? "", BASE).pathname).toBe("/");
  });
});
