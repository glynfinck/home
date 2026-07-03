// Seeds tag icons from the Dagster docs kind-tag table (the inspiration for
// our tag_kinds feature): downloads every kind icon, uploads it to the public
// `media` bucket under kinds/, and inserts a tag_kinds row per kind name.
// Idempotent — existing tag_kinds rows are left untouched; icon files are
// re-uploaded in place (stable names).
//
// Usage:  node scripts/seed-tag-kinds.mjs [--site http://localhost:3000]
// Env:    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//         REVALIDATE_SECRET (optional — skips cache revalidation if unset)
//         Falls back to .env.local for all three.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DOCS_URL =
  "https://docs.dagster.io/guides/build/assets/metadata-and-tags/kind-tags";
const DOCS_ORIGIN = new URL(DOCS_URL).origin;

function loadEnvLocal() {
  let text;
  try {
    text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=["']?([^"'\n]*)["']?$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (env or .env.local).",
  );
  process.exit(1);
}

const siteFlag = process.argv.indexOf("--site");
const site =
  siteFlag !== -1 ? process.argv[siteFlag + 1] : "http://localhost:3000";

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function fetchOk(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res;
}

/** kind name → icon path pairs from the docs page's reference table. */
async function scrapeKinds() {
  const html = await (await fetchOk(DOCS_URL)).text();
  const pairs = new Map();
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
      (m) => m[1],
    );
    if (cells.length < 2) continue;
    const decode = (s) =>
      s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const name = decode(cells[0].replace(/<[^>]*>/g, "").trim().toLowerCase());
    const src = cells[1].match(/src="([^"]+\.svg)"/);
    if (name && src) pairs.set(name, decode(src[1]));
  }
  if (pairs.size === 0) {
    throw new Error("No kind rows found — has the docs page layout changed?");
  }
  return pairs;
}

async function run() {
  const kinds = await scrapeKinds();
  const iconPaths = [...new Set(kinds.values())];
  console.log(`${kinds.size} kinds, ${iconPaths.length} unique icons`);

  // Download + upload each unique icon, remembering its public URL
  const urlByPath = new Map();
  let uploaded = 0;
  const queue = [...iconPaths];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let path; (path = queue.shift()); ) {
        const svg = await (await fetchOk(DOCS_ORIGIN + path)).arrayBuffer();
        const objectPath = `kinds/${path.split("/").pop()}`;
        const { error } = await supabase.storage
          .from("media")
          .upload(objectPath, svg, {
            upsert: true,
            contentType: "image/svg+xml",
          });
        if (error) throw new Error(`upload ${objectPath}: ${error.message}`);
        urlByPath.set(
          path,
          supabase.storage.from("media").getPublicUrl(objectPath).data
            .publicUrl,
        );
        uploaded += 1;
      }
    }),
  );
  console.log(`uploaded ${uploaded} icons to media/kinds/`);

  // Insert rows for kinds that aren't mapped yet (never overwrite manual edits)
  const { data: existing, error: readError } = await supabase
    .from("tag_kinds")
    .select("name");
  if (readError) throw readError;
  const have = new Set(existing.map((row) => row.name));
  const rows = [...kinds]
    .filter(([name]) => !have.has(name))
    .map(([name, path]) => ({ name, icon_url: urlByPath.get(path) }));

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase
      .from("tag_kinds")
      .insert(rows.slice(i, i + 100));
    if (error) throw error;
  }
  console.log(`inserted ${rows.length} tag_kinds rows (${have.size} already existed)`);

  if (process.env.REVALIDATE_SECRET) {
    const res = await fetch(`${site}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": process.env.REVALIDATE_SECRET,
      },
      body: JSON.stringify({ table: "tag_kinds" }),
    }).catch((err) => ({ ok: false, statusText: String(err) }));
    console.log(
      res.ok ? "revalidated tag-kinds cache" : `revalidate skipped: ${res.statusText}`,
    );
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
