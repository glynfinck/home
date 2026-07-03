"use client";

import "katex/dist/katex.min.css";

import * as React from "react";
import { Eye, EyeOff, ImageUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  MEDIA_IMAGE_ACCEPT,
  altFromFileName,
  uploadToMediaBucket,
} from "@/lib/media";

/**
 * MDX textarea with a live rendered preview underneath. Drafts are compiled
 * server-side via /admin/mdx-preview with the same pipeline as the public
 * pages, so what you see is what ships.
 *
 * Images (plots, diagrams) upload to the public `media` bucket — via the
 * toolbar button or by pasting straight into the textarea — and land as a
 * `<Figure />` at the cursor.
 */
export function MdxField({
  id,
  label,
  value,
  onChange,
  rows = 14,
  placeholder,
  imagePrefix = "mdx",
}: {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  imagePrefix?: string;
}) {
  const [showPreview, setShowPreview] = React.useState(false);
  const [html, setHtml] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function insertImage(file: File) {
    setUploading(true);
    try {
      const url = await uploadToMediaBucket(file, imagePrefix);
      const snippet = `<Figure src="${url}" alt="${altFromFileName(file.name)}" />`;

      // Insert as its own block at the cursor, then restore focus there.
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? value.length;
      const end = textarea?.selectionEnd ?? value.length;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const lead = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
      const trail = !after || after.startsWith("\n") ? "\n" : "\n\n";
      const inserted = `${lead}${snippet}${trail}`;

      onChange(before + inserted + after);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const cursor = before.length + inserted.length;
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  React.useEffect(() => {
    if (!showPreview) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!value.trim()) {
        setHtml("");
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/admin/mdx-preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: value }),
          signal: controller.signal,
        });
        const data = (await res.json()) as { html?: string; error?: string };
        if (res.ok && typeof data.html === "string") {
          setHtml(data.html);
          setError(null);
        } else {
          setError(data.error ?? "Preview failed");
        }
      } catch {
        if (!controller.signal.aborted) setError("Preview failed");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 500);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [showPreview, value]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={MEDIA_IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void insertImage(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Spinner className="size-3.5" /> : <ImageUp className="size-3.5" />}
            Image
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? (
              <>
                <EyeOff className="size-3.5" /> Hide preview
              </>
            ) : (
              <>
                <Eye className="size-3.5" /> Preview
              </>
            )}
          </Button>
        </div>
      </div>
      <Textarea
        id={id}
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => {
          const file = Array.from(e.clipboardData.files).find((f) =>
            f.type.startsWith("image/"),
          );
          if (file && !uploading) {
            e.preventDefault();
            void insertImage(file);
          }
        }}
        rows={rows}
        className="font-mono text-sm leading-relaxed"
        placeholder={placeholder}
      />
      {showPreview ? (
        <div className="mt-1 rounded-lg border border-dashed border-brand/40">
          <div className="flex items-center justify-between border-b border-dashed border-brand/40 bg-brand/5 px-4 py-2">
            <p className="font-mono text-xs text-brand">preview</p>
            {loading ? <Spinner className="size-3.5" /> : null}
          </div>
          <div className="px-4 py-4">
            {error ? (
              <p className="font-mono text-xs leading-relaxed text-destructive">
                {error}
              </p>
            ) : html ? (
              <div
                className="prose-article"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing to preview yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
