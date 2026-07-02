#!/usr/bin/env bash
# End-to-end smoke against a production build (`next start`) backed by local
# Supabase. Boots the server, curls the real surfaces, tears it down.
# Requires: the app already built (`npm run build`) and the research PDF
# uploaded (scripts/ci-smoke.mjs does that before this runs).
set -uo pipefail

BASE="http://localhost:3000"
pass=0
fail=0

ok()   { pass=$((pass + 1)); echo "  ✓ $1"; }
bad()  { fail=$((fail + 1)); echo "  ✗ $1 ${2:-}"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$1"; }
body() { curl -s "$1"; }
# substring test with no pipes — avoids pipefail races on large bodies
has()  { case "$1" in *"$2"*) return 0 ;; *) return 1 ;; esac; }

npm run start > /tmp/next-start.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

echo "waiting for server…"
for _ in $(seq 1 60); do
  curl -sf "$BASE/" > /dev/null 2>&1 && break
  sleep 1
done
curl -sf "$BASE/" > /dev/null 2>&1 || { echo "server never came up"; cat /tmp/next-start.log; exit 1; }

echo "pages"
[ "$(code "$BASE/")" = 200 ] && ok "home 200" || bad "home 200"
home_html=$(body "$BASE/")
has "$home_html" "Software engineer" && ok "home hero from settings" || bad "home hero"
blog_html=$(body "$BASE/blog")
has "$blog_html" "momentum-signal-decay" && ok "blog lists published" || bad "blog lists published"
has "$blog_html" "draft-example" && bad "blog leaks draft" || ok "blog hides drafts"

echo "mdx pipeline"
post_html=$(body "$BASE/blog/momentum-signal-decay")
has "$post_html" "katex" && ok "post renders KaTeX" || bad "post renders KaTeX"
has "$post_html" "data-rehype-pretty-code-figure" && ok "post renders code block" || bad "post renders code block"
has "$post_html" "Referenced research" && ok "post shows referenced research" || bad "post shows referenced research"

echo "downloads"
[ "$(code "$BASE/api/download/momentum-decay-crypto")" = 302 ] && ok "published download 302" || bad "published download 302"
pdf_head=$(curl -sL "$BASE/api/download/momentum-decay-crypto" | head -c 5)
has "$pdf_head" "%PDF" && ok "download serves PDF bytes" || bad "download serves PDF bytes"
[ "$(code "$BASE/api/download/draft-paper")" = 404 ] && ok "draft download blocked" || bad "draft download blocked"

echo "status codes & SEO"
[ "$(code "$BASE/blog/does-not-exist")" = 404 ] && ok "missing post 404" || bad "missing post 404"
has "$(body "$BASE/robots.txt")" "Disallow: /admin" && ok "robots blocks admin" || bad "robots blocks admin"
has "$(body "$BASE/sitemap.xml")" "blog/momentum-signal-decay" && ok "sitemap has posts" || bad "sitemap has posts"
has "$(body "$BASE/rss.xml")" "<item>" && ok "rss has items" || bad "rss has items"

echo ""
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
