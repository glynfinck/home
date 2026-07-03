"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { CACHE_TAGS } from "@/lib/data/settings";
import { estimateReadingMinutes } from "@/lib/format";
import { requireAdmin } from "@/lib/actions/guard";
import {
  profileSettingsSchema,
  seoSettingsSchema,
  socialLinksSchema,
} from "@/lib/settings";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function failure(error: unknown, fallback: string): ActionResult {
  const message =
    error instanceof Error && /Not auth/.test(error.message)
      ? error.message
      : fallback;
  return { ok: false, error: message };
}

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits, dashes");

/* ------------------------------- posts ---------------------------------- */

const postSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required"),
  slug: slugSchema,
  excerpt: z.string().trim(),
  content: z.string(),
  cover_image_url: z.string().trim(),
  tags: z.array(z.string().trim().min(1)).max(12),
  status: z.enum(["draft", "published", "archived"]),
  published_at: z.string().nullable(),
  paperIds: z.array(z.string().uuid()).default([]),
});

export type PostInput = z.infer<typeof postSchema>;

export async function upsertPost(input: PostInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const parsed = postSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    const { id, paperIds, ...fields } = parsed.data;

    const row = {
      ...fields,
      excerpt: fields.excerpt || null,
      cover_image_url: fields.cover_image_url || null,
      reading_minutes: estimateReadingMinutes(fields.content),
      // First publish stamps published_at automatically
      published_at:
        fields.status === "published" && !fields.published_at
          ? new Date().toISOString()
          : fields.published_at,
    };

    const query = id
      ? supabase.from("posts").update(row).eq("id", id).select("id, slug")
      : supabase.from("posts").insert(row).select("id, slug");
    const { data, error } = await query.single();
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "Slug already in use" : error.message,
      };
    }

    // Sync post ↔ paper references
    await supabase.from("post_papers").delete().eq("post_id", data.id);
    if (paperIds.length > 0) {
      const { error: linkError } = await supabase
        .from("post_papers")
        .insert(paperIds.map((paper_id) => ({ post_id: data.id, paper_id })));
      if (linkError) return { ok: false, error: linkError.message };
    }

    updateTag(CACHE_TAGS.posts);
    updateTag(CACHE_TAGS.post(data.slug));
    updateTag(CACHE_TAGS.research); // "Discussed in" backlinks
    return { ok: true, id: data.id };
  } catch (error) {
    return failure(error, "Could not save post");
  }
}

export async function deletePost(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    updateTag(CACHE_TAGS.posts);
    updateTag(CACHE_TAGS.research);
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not delete post");
  }
}

/* ------------------------------ projects -------------------------------- */

const projectSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required"),
  slug: slugSchema,
  summary: z.string().trim().min(1, "Summary is required"),
  description: z.string().trim(),
  content: z.string(),
  tech_stack: z.array(z.string().trim().min(1)).max(20),
  cover_image_url: z.string().trim(),
  github_url: z.string().trim(),
  live_url: z.string().trim(),
  featured: z.boolean(),
  sort_order: z.number().int(),
  status: z.enum(["draft", "published", "archived"]),
});

export type ProjectInput = z.infer<typeof projectSchema>;

export async function upsertProject(
  input: ProjectInput,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    const { id, ...fields } = parsed.data;
    const row = {
      ...fields,
      description: fields.description || null,
      content: fields.content || null,
      cover_image_url: fields.cover_image_url || null,
      github_url: fields.github_url || null,
      live_url: fields.live_url || null,
    };

    const query = id
      ? supabase.from("projects").update(row).eq("id", id).select("id, slug")
      : supabase.from("projects").insert(row).select("id, slug");
    const { data, error } = await query.single();
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "Slug already in use" : error.message,
      };
    }

    updateTag(CACHE_TAGS.projects);
    updateTag(CACHE_TAGS.project(data.slug));
    return { ok: true, id: data.id };
  } catch (error) {
    return failure(error, "Could not save project");
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    updateTag(CACHE_TAGS.projects);
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not delete project");
  }
}

/* ------------------------------ tag kinds ------------------------------- */

const tagKindSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Tag name is required").max(40),
  icon_url: z.string().trim().min(1, "Upload an icon first"),
});

export type TagKindInput = z.infer<typeof tagKindSchema>;

export async function upsertTagKind(input: TagKindInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const parsed = tagKindSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    const { id, ...fields } = parsed.data;
    // Tags match kinds case-insensitively; stored lowercase like picker tags
    const row = { ...fields, name: fields.name.toLowerCase() };

    const query = id
      ? supabase.from("tag_kinds").update(row).eq("id", id).select("id")
      : supabase.from("tag_kinds").insert(row).select("id");
    const { data, error } = await query.single();
    if (error) {
      return {
        ok: false,
        error:
          error.code === "23505"
            ? "That tag already has an icon"
            : error.message,
      };
    }

    updateTag(CACHE_TAGS.tagKinds);
    return { ok: true, id: data.id };
  } catch (error) {
    return failure(error, "Could not save tag icon");
  }
}

export async function deleteTagKind(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("tag_kinds").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    updateTag(CACHE_TAGS.tagKinds);
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not delete tag icon");
  }
}

/* ------------------------------ research -------------------------------- */

const paperSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required"),
  slug: slugSchema,
  abstract: z.string().trim().min(1, "Abstract is required"),
  content: z.string(),
  pdf_path: z.string().trim().min(1, "Upload a PDF first"),
  pdf_size_bytes: z.number().int().nullable(),
  topics: z.array(z.string().trim().min(1)).max(12),
  status: z.enum(["draft", "published", "archived"]),
  published_at: z.string().nullable(),
});

export type PaperInput = z.infer<typeof paperSchema>;

export async function upsertPaper(input: PaperInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const parsed = paperSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    const { id, ...fields } = parsed.data;
    const row = {
      ...fields,
      content: fields.content || null,
      published_at:
        fields.status === "published" && !fields.published_at
          ? new Date().toISOString()
          : fields.published_at,
    };

    const query = id
      ? supabase.from("research_papers").update(row).eq("id", id).select("id, slug")
      : supabase.from("research_papers").insert(row).select("id, slug");
    const { data, error } = await query.single();
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "Slug already in use" : error.message,
      };
    }

    updateTag(CACHE_TAGS.research);
    updateTag(CACHE_TAGS.paper(data.slug));
    updateTag(CACHE_TAGS.posts); // "Referenced research" sections
    return { ok: true, id: data.id };
  } catch (error) {
    return failure(error, "Could not save paper");
  }
}

export async function deletePaper(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("research_papers")
      .delete()
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    updateTag(CACHE_TAGS.research);
    updateTag(CACHE_TAGS.posts);
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not delete paper");
  }
}

/* ------------------------------ comments -------------------------------- */

export async function setCommentStatus(
  commentId: string,
  status: "visible" | "hidden",
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.rpc("moderate_comment", {
      comment_id: commentId,
      new_status: status,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/blog/[slug]", "page");
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not update comment");
  }
}

export async function hardDeleteComment(
  commentId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/blog/[slug]", "page");
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not delete comment");
  }
}

/* ------------------------------ settings -------------------------------- */

const settingsPayloadSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("profile"), value: profileSettingsSchema }),
  z.object({ key: z.literal("social_links"), value: socialLinksSchema }),
  z.object({ key: z.literal("seo"), value: seoSettingsSchema }),
]);

export type SettingsInput = z.infer<typeof settingsPayloadSchema>;

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const parsed = settingsPayloadSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: parsed.data.key, value: parsed.data.value });
    if (error) return { ok: false, error: error.message };

    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not save settings");
  }
}
