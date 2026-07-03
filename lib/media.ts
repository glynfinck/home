"use client";

import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/format";

/** Image mime types the public `media` bucket accepts (mirrors bucket config). */
export const MEDIA_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml";

/** Human-readable default alt text from a file name ("loss-curve.png" → "loss curve"). */
export function altFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/^\d{10,}-/, "")
    .replace(/[-_]+/g, " ")
    .replace(/"/g, "")
    .trim();
}

/** Object path inside the public `media` bucket from its public URL, or null. */
export function mediaPathFromPublicUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/media/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}

/**
 * Direct browser upload to the public `media` bucket (admin storage RLS).
 * Objects get a timestamped, slugged name so replacements never fight the
 * CDN cache. Returns the public URL; `download` bakes a content-disposition
 * filename into it so links save the file instead of opening it inline.
 */
export async function uploadToMediaBucket(
  file: File,
  prefix: string,
  { download }: { download?: string } = {},
): Promise<string> {
  const supabase = createClient();
  const dot = file.name.lastIndexOf(".");
  const ext = (dot > 0 ? file.name.slice(dot + 1) : "bin").toLowerCase();
  const base = slugify(dot > 0 ? file.name.slice(0, dot) : file.name) || "file";
  const path = `${prefix}/${Date.now()}-${base}.${ext}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage
    .from("media")
    .getPublicUrl(path, download ? { download } : undefined);
  return data.publicUrl;
}
