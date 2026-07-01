# glyn.dev

Personal brand site: portfolio, blog, and quant research hub. Fully
data-driven — content lives in Supabase and updates go live **without a
redeploy**.

**Stack:** Next.js 16 (App Router, RSC) · Tailwind CSS v4 · shadcn/ui ·
Supabase (Postgres + Auth + Storage) · Vercel

## Architecture at a glance

- **Data-driven everything** — bio, social links, SEO, projects, posts, and
  research papers live in Postgres (`site_settings` is a key–value jsonb
  table). Public reads go through `lib/data/*` wrapped in `unstable_cache`
  with cache tags.
- **No-redeploy updates** — admin server actions call `updateTag()`
  (read-your-own-writes). Edits made directly in Supabase Studio propagate
  via a Database Webhook → `POST /api/revalidate` (secured by
  `x-revalidate-secret`). Time-based ISR (1h) is the safety net.
- **Secure PDF downloads** — research PDFs sit in a **private** bucket.
  `GET /api/download/[slug]` verifies the paper is published (RLS), logs the
  download, and 302s to a 60-second signed URL. Free for everyone; the raw
  storage path grants nothing.
- **Auth** — Supabase Auth with GitHub/Google (PKCE). Sign-in is only needed
  to comment. Sole-admin model: `profiles.is_admin` gates `/admin` and every
  write via RLS.
- **Comments** — post-moderation: visible immediately, admin can hide
  (`moderate_comment` RPC), authors can edit/soft-delete. One-level
  threading. Plain text only (never rendered as MDX).
- **MDX** — posts/papers are MDX with GFM, KaTeX math, shiki code
  highlighting, and custom components (`<Callout>`, `<Figure>`,
  `<PaperCard slug="…" />` to embed a paper inline).

## Local development

Prereqs: Node 20+, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase start        # local Postgres/Auth/Storage (applies migrations + seed)
cp .env.example .env.local   # then paste values printed by `supabase start`
npm install
npm run dev
```

`.env.local` for the local stack:

| var | value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` from `supabase start` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` from `supabase start` (server-only) |
| `REVALIDATE_SECRET` | any strong random string |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |

Useful commands:

```bash
supabase db reset                                  # re-apply migrations + seed
supabase gen types typescript --local > types/database.ts
npm run build && npm run start                     # production behavior locally
```

### Bootstrap yourself as admin

Sign in once (creates your `profiles` row via trigger), then in the SQL
editor:

```sql
update profiles set is_admin = true where id = (
  select id from auth.users where email = 'you@example.com'
);
```

`/admin` then unlocks: posts (MDX editor + preview), projects, research
(PDF upload), comment moderation, and site settings.

### OAuth locally (optional)

Comments require GitHub/Google sign-in. For local testing you can create a
password user instead (Studio → Authentication), or enable providers in
`supabase/config.toml` (`[auth.external.github]`, env-referenced secrets)
with a GitHub OAuth app pointing at
`http://127.0.0.1:54321/auth/v1/callback`.

## Production deploy

1. **Supabase project** — create one, then:
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # applies migrations (schema, RLS, buckets)
   ```
2. **Auth providers** — dashboard → Authentication → Providers: enable
   GitHub + Google. Provider callback URL is
   `https://<ref>.supabase.co/auth/v1/callback`. Under URL Configuration set
   Site URL to `https://glyn.dev` and add
   `https://glyn.dev/auth/callback` to Redirect URLs.
3. **Vercel** — import the repo, set the five env vars (production values;
   `NEXT_PUBLIC_SITE_URL=https://glyn.dev`).
4. **Revalidation webhook** — dashboard → Database → Webhooks: one webhook
   per content table (`site_settings`, `posts`, `projects`,
   `research_papers`, `post_papers`) on INSERT/UPDATE/DELETE →
   `https://glyn.dev/api/revalidate` with header
   `x-revalidate-secret: <REVALIDATE_SECRET>`. (Only needed for edits made
   directly in Studio — the admin UI revalidates inline.)
5. **Domain** — add `glyn.dev` in Vercel.
6. **Admin** — sign in once on production, run the bootstrap SQL above.

## Project layout

```
app/(site)/          public pages (home, projects, blog, research, about)
app/admin/           gated dashboard (CRUD, uploads, moderation, settings)
app/api/download/    signed-URL PDF downloads (+ logging)
app/api/revalidate/  cache webhook (Studio edits)
lib/supabase/        server/browser/proxy/service-role clients
lib/data/            cached data layer (unstable_cache + tags)
lib/actions/         server actions (comments, admin CRUD)
components/site/     public UI (cards, comments, MDX components)
components/admin/    editors, uploads, moderation
supabase/            config, migrations, seed
```

## Design system

Zinc dark-first palette with an emerald accent (`--brand`), Geist Sans/Mono,
1px borders over shadows, 150–200ms ease-out transitions. Tokens live in
`app/globals.css` (Tailwind v4 `@theme` + shadcn CSS variables).
