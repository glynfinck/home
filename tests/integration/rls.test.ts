import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  createUser,
  signIn,
} from "../helpers/supabase";

// Exercises the Row-Level-Security policies against a real local Postgres.
// Fixtures use unique emails per run so repeated local runs don't collide.
const admin = adminClient();
const anon = anonClient();
const stamp = Date.now();
const email = { alice: `alice-${stamp}@ci.test`, bob: `bob-${stamp}@ci.test` };

let aliceId: string;
let bobId: string;
let alice: SupabaseClient;
let bob: SupabaseClient;
let publishedPostId: string;
let draftPostId: string;
let paperId: string;
let downloadsBefore: number;
let comment: string; // shared through the lifecycle below

beforeAll(async () => {
  aliceId = await createUser(email.alice, "Alice");
  bobId = await createUser(email.bob, "Bob");
  alice = await signIn(email.alice);
  bob = await signIn(email.bob);

  const { data: posts } = await admin
    .from("posts")
    .select("id, slug")
    .in("slug", ["hello-world", "draft-example"]);
  publishedPostId = posts!.find((p) => p.slug === "hello-world")!.id;
  draftPostId = posts!.find((p) => p.slug === "draft-example")!.id;

  const { data: paper } = await admin
    .from("research_papers")
    .select("id, download_count")
    .eq("slug", "momentum-decay-crypto")
    .single();
  paperId = paper!.id;
  downloadsBefore = paper!.download_count;

  const { data, error } = await alice
    .from("comments")
    .insert({ post_id: publishedPostId, user_id: aliceId, body: "lifecycle" })
    .select("id")
    .single();
  if (error) throw new Error(`fixture comment: ${error.message}`);
  comment = data!.id;
});

describe("anon read policies", () => {
  it("shows published posts and hides drafts", async () => {
    const { data } = await anon.from("posts").select("slug");
    const slugs = (data ?? []).map((r) => r.slug);
    expect(slugs).toContain("hello-world");
    expect(slugs).not.toContain("draft-example");
  });

  it("denies anon access to download stats", async () => {
    const { error } = await anon.from("paper_downloads").select("id");
    expect(error).not.toBeNull();
  });

  it("rejects anon writes", async () => {
    const { error } = await anon.from("posts").insert({ slug: "x", title: "x" });
    expect(error).not.toBeNull();
  });
});

describe("comment insert policies", () => {
  it("lets a signed-in user comment on a published post", async () => {
    const { data, error } = await alice
      .from("comments")
      .insert({ post_id: publishedPostId, user_id: aliceId, body: "great" })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  it("blocks comments on a draft post", async () => {
    const { error } = await alice
      .from("comments")
      .insert({ post_id: draftPostId, user_id: aliceId, body: "sneaky" });
    expect(error).not.toBeNull();
  });

  it("prevents spoofing another user_id", async () => {
    const { error } = await alice
      .from("comments")
      .insert({ post_id: publishedPostId, user_id: bobId, body: "spoof" });
    expect(error).not.toBeNull();
  });
});

describe("threading", () => {
  let replyId: string;

  it("allows a reply to a top-level comment", async () => {
    const { data, error } = await bob
      .from("comments")
      .insert({
        post_id: publishedPostId,
        user_id: bobId,
        parent_id: comment,
        body: "agreed",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    replyId = data!.id;
  });

  it("enforces one level of nesting", async () => {
    const { error } = await alice.from("comments").insert({
      post_id: publishedPostId,
      user_id: aliceId,
      parent_id: replyId,
      body: "too deep",
    });
    expect(error).not.toBeNull();
  });
});

describe("ownership & column grants", () => {
  it("prevents editing another user's comment", async () => {
    const { data } = await bob
      .from("comments")
      .update({ body: "defaced" })
      .eq("id", comment)
      .select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("blocks self-moderation via the status column", async () => {
    const { error } = await alice
      .from("comments")
      .update({ status: "hidden" })
      .eq("id", comment);
    expect(error).not.toBeNull();
  });

  it("allows editing your own comment body", async () => {
    const { data, error } = await alice
      .from("comments")
      .update({ body: "edited" })
      .eq("id", comment)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });
});

describe("moderation", () => {
  it("rejects moderation by a non-admin", async () => {
    const { error } = await bob.rpc("moderate_comment", {
      comment_id: comment,
      new_status: "hidden",
    });
    expect(error).not.toBeNull();
  });

  it("lets an admin hide, invisible to anon but visible to admin", async () => {
    await admin.from("profiles").update({ is_admin: true }).eq("id", bobId);

    const { error } = await bob.rpc("moderate_comment", {
      comment_id: comment,
      new_status: "hidden",
    });
    expect(error).toBeNull();

    const { data: anonSees } = await anon
      .from("comments")
      .select("id")
      .eq("id", comment);
    expect(anonSees ?? []).toHaveLength(0);

    const { data: adminSees } = await bob
      .from("comments")
      .select("id")
      .eq("id", comment);
    expect(adminSees ?? []).toHaveLength(1);

    await bob.rpc("moderate_comment", {
      comment_id: comment,
      new_status: "visible",
    });
  });
});

describe("soft delete", () => {
  it("lets an author soft-delete, hiding it from anon", async () => {
    const { error } = await alice
      .from("comments")
      .update({ deleted_at: new Date(0).toISOString() })
      .eq("id", comment);
    expect(error).toBeNull();

    const { data } = await anon.from("comments").select("id").eq("id", comment);
    expect(data ?? []).toHaveLength(0);
  });
});

describe("profile self-protection", () => {
  it("allows updating your own display fields", async () => {
    const { error } = await alice
      .from("profiles")
      .update({ display_name: "Alice T." })
      .eq("id", aliceId);
    expect(error).toBeNull();
  });

  it("prevents self-promotion to admin", async () => {
    const { error } = await alice
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", aliceId);
    expect(error).not.toBeNull();
  });
});

describe("security-definer counters (anon-callable)", () => {
  it("increments post views", async () => {
    const read = () =>
      admin
        .from("posts")
        .select("view_count")
        .eq("id", publishedPostId)
        .single();
    const before = (await read()).data!.view_count;
    await anon.rpc("increment_post_views", { post_slug: "hello-world" });
    const after = (await read()).data!.view_count;
    expect(after).toBe(before + 1);
  });

  it("logs paper downloads", async () => {
    await anon.rpc("log_paper_download", {
      paper_slug: "momentum-decay-crypto",
    });
    const { data } = await admin
      .from("research_papers")
      .select("download_count")
      .eq("id", paperId)
      .single();
    expect(data!.download_count).toBeGreaterThan(downloadsBefore);
  });
});
