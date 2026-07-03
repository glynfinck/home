"use client";

import * as React from "react";
import { FileUp, ImageUp, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, slugify } from "@/lib/format";
import { MEDIA_IMAGE_ACCEPT, uploadToMediaBucket } from "@/lib/media";

/** Direct browser upload to the public `media` bucket (admin storage RLS). */
export function ImageUploadField({
  value,
  onChange,
  prefix,
}: {
  value: string;
  onChange: (url: string) => void;
  prefix: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    try {
      onChange(await uploadToMediaBucket(file, prefix));
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Cover"
          className="h-14 w-24 rounded-md border object-cover"
        />
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Spinner /> : <ImageUp className="size-4" />}
        {value ? "Replace image" : "Upload image"}
      </Button>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange("")}
        >
          <X className="size-4" /> Remove
        </Button>
      ) : null}
    </div>
  );
}

/** Direct browser upload to the private `research` bucket. Returns the path. */
export function PdfUploadField({
  path,
  sizeBytes,
  onChange,
  prefix,
}: {
  path: string;
  sizeBytes: number | null;
  onChange: (path: string, sizeBytes: number) => void;
  prefix: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const objectPath = `${prefix}/${Date.now()}.pdf`;
      const { error } = await supabase.storage
        .from("research")
        .upload(objectPath, file, {
          upsert: false,
          contentType: "application/pdf",
        });
      if (error) throw error;
      onChange(objectPath, file.size);
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Spinner /> : <FileUp className="size-4" />}
        {path ? "Replace PDF" : "Upload PDF"}
      </Button>
      {path ? (
        <span className="font-mono text-xs text-muted-foreground">
          {path}
          {sizeBytes ? ` · ${formatBytes(sizeBytes)}` : ""}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">
          Stored in the private bucket — served via signed URLs.
        </span>
      )}
    </div>
  );
}

/**
 * Resume URL with an upload path: PDFs go to the public `media` bucket and
 * the stored URL carries a download filename, so the About page button saves
 * the file instead of opening it. Pasting an external URL still works.
 */
export function ResumeUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    setUploading(true);
    try {
      const download = `${slugify(file.name.replace(/\.pdf$/i, "")) || "resume"}.pdf`;
      onChange(await uploadToMediaBucket(file, "resume", { download }));
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… or upload a PDF"
        className="font-mono text-sm"
      />
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Spinner /> : <FileUp className="size-4" />}
        {value ? "Replace" : "Upload"}
      </Button>
    </div>
  );
}
