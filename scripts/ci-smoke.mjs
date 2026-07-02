// RLS + auth regression suite — runs against a local Supabase (CI or dev).
//
// Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY from the environment. Creates two throwaway
// users, exercises the comment/profile/download policies end-to-end, and
// exits non-zero on the first broken invariant.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("Missing Supabase env (URL / ANON / SERVICE_ROLE).");
  process.exit(2);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, SERVICE, opts);
const anon = createClient(URL, ANON, opts);

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function userClient(email) {
  const c = createClient(URL, ANON, opts);
  const { error } = await c.auth.signInWithPassword({
    email,
    password: "test-password-123",
  });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

const SAMPLE_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

async function main() {
  // --- fixtures -----------------------------------------------------------
  const users = {};
  for (const name of ["alice", "bob"]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${name}@ci.test`,
      password: "test-password-123",
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw new Error(`createUser ${name}: ${error.message}`);
    users[name] = data.user.id;
  }

  const { data: posts } = await admin
    .from("posts")
    .select("id, slug")
    .in("slug", ["hello-world", "draft-example"]);
  const publishedPost = posts.find((p) => p.slug === "hello-world");
  const draftPost = posts.find((p) => p.slug === "draft-example");

  const { data: paper } = await admin
    .from("research_papers")
    .select("id, slug, download_count")
    .eq("slug", "momentum-decay-crypto")
    .single();

  // upload the PDF the download route (and e2e) will sign. Use a Buffer, not
  // a Blob: an untyped Blob uploads as application/octet-stream, which the
  // research bucket's allowed_mime_types (application/pdf) rejects with 415.
  const upload = await admin.storage
    .from("research")
    .upload("papers/momentum-decay-crypto.pdf", Buffer.from(SAMPLE_PDF), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upload.error) throw new Error(`PDF upload failed: ${upload.error.message}`);

  const alice = await userClient("alice@ci.test");
  const bob = await userClient("bob@ci.test");

  // --- anon visibility ----------------------------------------------------
  console.log("anon read policies");
  {
    const { data } = await anon.from("posts").select("slug");
    const slugs = (data ?? []).map((r) => r.slug);
    check("published post visible", slugs.includes("hello-world"));
    check("draft post hidden", !slugs.includes("draft-example"));
  }
  {
    const { error } = await anon.from("paper_downloads").select("id");
    check("download stats denied to anon", error !== null);
  }
  {
    const { error } = await anon
      .from("posts")
      .insert({ slug: "x", title: "x" });
    check("anon cannot write posts", error !== null);
  }

  // --- comment insert policies -------------------------------------------
  console.log("comment insert policies");
  let commentId;
  {
    const { data, error } = await alice
      .from("comments")
      .insert({
        post_id: publishedPost.id,
        user_id: users.alice,
        body: "CI comment from alice",
      })
      .select("id")
      .single();
    check("owner comments on published post", !error && !!data, error?.message);
    commentId = data?.id;
  }
  {
    const { error } = await alice.from("comments").insert({
      post_id: draftPost.id,
      user_id: users.alice,
      body: "on a draft",
    });
    check("cannot comment on draft post", error !== null);
  }
  {
    const { error } = await alice.from("comments").insert({
      post_id: publishedPost.id,
      user_id: users.bob, // spoof
      body: "impersonation",
    });
    check("cannot spoof another user_id", error !== null);
  }

  // --- threading ----------------------------------------------------------
  console.log("threading");
  let replyId;
  {
    const { data, error } = await bob
      .from("comments")
      .insert({
        post_id: publishedPost.id,
        user_id: users.bob,
        parent_id: commentId,
        body: "reply from bob",
      })
      .select("id")
      .single();
    check("reply to top-level comment", !error && !!data, error?.message);
    replyId = data?.id;
  }
  {
    const { error } = await alice.from("comments").insert({
      post_id: publishedPost.id,
      user_id: users.alice,
      parent_id: replyId, // nesting under a reply
      body: "too deep",
    });
    check("one-level threading enforced", error !== null);
  }

  // --- ownership + column protection -------------------------------------
  console.log("ownership & column grants");
  {
    const { data } = await bob
      .from("comments")
      .update({ body: "defaced" })
      .eq("id", commentId)
      .select("id");
    check("cannot edit another user's comment", (data ?? []).length === 0);
  }
  {
    const { error } = await alice
      .from("comments")
      .update({ status: "hidden" })
      .eq("id", commentId);
    check("owner cannot self-moderate (column grant)", error !== null);
  }
  {
    const { data, error } = await alice
      .from("comments")
      .update({ body: "edited by alice" })
      .eq("id", commentId)
      .select("id");
    check("owner can edit own body", !error && (data ?? []).length === 1);
  }

  // --- moderation ---------------------------------------------------------
  console.log("moderation");
  {
    const { error } = await bob.rpc("moderate_comment", {
      comment_id: commentId,
      new_status: "hidden",
    });
    check("non-admin cannot moderate", error !== null);
  }
  await admin.from("profiles").update({ is_admin: true }).eq("id", users.bob);
  const bobAdmin = await userClient("bob@ci.test"); // fresh token
  {
    const { error } = await bobAdmin.rpc("moderate_comment", {
      comment_id: commentId,
      new_status: "hidden",
    });
    check("admin can moderate", error === null, error?.message);
  }
  {
    const { data } = await anon.from("comments").select("id").eq("id", commentId);
    check("hidden comment invisible to anon", (data ?? []).length === 0);
    const { data: adminSees } = await bobAdmin
      .from("comments")
      .select("id")
      .eq("id", commentId);
    check("hidden comment visible to admin", (adminSees ?? []).length === 1);
  }
  await bobAdmin.rpc("moderate_comment", {
    comment_id: commentId,
    new_status: "visible",
  });

  // --- soft delete --------------------------------------------------------
  console.log("soft delete");
  {
    const { error } = await alice
      .from("comments")
      .update({ deleted_at: new Date(0).toISOString() })
      .eq("id", commentId);
    check("owner can soft-delete", error === null, error?.message);
    const { data } = await anon.from("comments").select("id").eq("id", commentId);
    check("soft-deleted comment invisible to anon", (data ?? []).length === 0);
  }

  // --- profile self-protection -------------------------------------------
  console.log("profile column protection");
  {
    const { error } = await alice
      .from("profiles")
      .update({ display_name: "Alice T." })
      .eq("id", users.alice);
    check("can update own display fields", error === null, error?.message);
  }
  {
    const { error } = await alice
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", users.alice);
    check("cannot self-promote to admin", error !== null);
  }

  // --- security-definer counters -----------------------------------------
  console.log("counter RPCs (anon-callable)");
  {
    const before = (
      await admin
        .from("posts")
        .select("view_count")
        .eq("id", publishedPost.id)
        .single()
    ).data.view_count;
    await anon.rpc("increment_post_views", { post_slug: "hello-world" });
    const after = (
      await admin
        .from("posts")
        .select("view_count")
        .eq("id", publishedPost.id)
        .single()
    ).data.view_count;
    check("increment_post_views works for anon", after === before + 1);
  }
  {
    await anon.rpc("log_paper_download", {
      paper_slug: "momentum-decay-crypto",
    });
    const { data } = await admin
      .from("research_papers")
      .select("download_count")
      .eq("id", paper.id)
      .single();
    check(
      "log_paper_download increments counter",
      data.download_count > paper.download_count,
    );
  }

  // --- summary ------------------------------------------------------------
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("smoke suite crashed:", err);
  process.exit(1);
});
