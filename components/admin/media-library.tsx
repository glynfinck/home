"use client";

import * as React from "react";
import { Code, FileText, LinkIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, formatDate } from "@/lib/format";
import {
  MEDIA_IMAGE_ACCEPT,
  altFromFileName,
  uploadToMediaBucket,
} from "@/lib/media";

type MediaItem = {
  path: string;
  name: string;
  folder: string;
  url: string;
  size: number | null;
  mimetype: string;
  createdAt: string | null;
};

/** Recursively list the `media` bucket (folders come back as id-less rows). */
async function listFolder(
  supabase: ReturnType<typeof createClient>,
  prefix: string,
  depth = 0,
): Promise<MediaItem[]> {
  const { data, error } = await supabase.storage
    .from("media")
    .list(prefix, { limit: 1000 });
  if (error) throw error;

  const items: MediaItem[] = [];
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!entry.id) {
      if (depth < 3) items.push(...(await listFolder(supabase, path, depth + 1)));
      continue;
    }
    const metadata = entry.metadata as { size?: number; mimetype?: string } | null;
    items.push({
      path,
      name: entry.name,
      folder: prefix || "/",
      url: supabase.storage.from("media").getPublicUrl(path).data.publicUrl,
      size: metadata?.size ?? null,
      mimetype: metadata?.mimetype ?? "",
      createdAt: entry.created_at ?? null,
    });
  }
  return items;
}

function copyToClipboard(text: string, message: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(message),
    () => toast.error("Copy failed"),
  );
}

export function MediaLibrary() {
  const [items, setItems] = React.useState<MediaItem[] | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(
    () =>
      listFolder(createClient(), "")
        .then((all) => {
          all.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
          setItems(all);
        })
        .catch((error: unknown) => {
          toast.error("Could not load media", {
            description: error instanceof Error ? error.message : undefined,
          });
          setItems([]);
        }),
    [],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  async function upload(files: File[]) {
    setUploading(true);
    try {
      for (const file of files) {
        await uploadToMediaBucket(
          file,
          file.type === "application/pdf" ? "files" : "mdx",
        );
      }
      toast.success(files.length === 1 ? "Uploaded" : `${files.length} uploaded`);
      await load();
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: MediaItem) {
    const { error } = await createClient().storage
      .from("media")
      .remove([item.path]);
    if (error) {
      toast.error("Delete failed", { description: error.message });
      return;
    }
    toast.success("File deleted");
    setItems((all) => all?.filter((i) => i.path !== item.path) ?? null);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
        <input
          ref={inputRef}
          type="file"
          accept={`${MEDIA_IMAGE_ACCEPT},application/pdf`}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) void upload(files);
            e.target.value = "";
          }}
        />
        <Button size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Spinner /> : <Upload className="size-4" />} Upload
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Images and files in the public media bucket. Reference images from any
        MDX field with a{" "}
        <code className="font-mono text-xs">&lt;Figure /&gt;</code> — copy the
        snippet below.
      </p>

      {items === null ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Nothing here yet — upload a plot, diagram, or PDF.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <MediaCard key={item.path} item={item} onDelete={() => remove(item)} />
          ))}
        </div>
      )}
    </>
  );
}

function MediaCard({
  item,
  onDelete,
}: {
  item: MediaItem;
  onDelete: () => void;
}) {
  const isImage = item.mimetype.startsWith("image/");

  return (
    <div className="overflow-hidden rounded-lg border">
      <a href={item.url} target="_blank" rel="noreferrer" className="block">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.name}
            loading="lazy"
            className="h-32 w-full border-b bg-muted/20 object-cover"
          />
        ) : (
          <div className="flex h-32 items-center justify-center border-b bg-muted/20">
            <FileText className="size-8 text-muted-foreground" />
          </div>
        )}
      </a>
      <div className="p-2.5">
        <p className="truncate font-mono text-xs" title={item.path}>
          {item.name}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {[item.folder, formatBytes(item.size), formatDate(item.createdAt)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-1.5 flex items-center gap-0.5">
          {isImage ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Copy Figure snippet"
              title="Copy <Figure /> snippet"
              onClick={() =>
                copyToClipboard(
                  `<Figure src="${item.url}" alt="${altFromFileName(item.name)}" />`,
                  "Snippet copied — paste it into any MDX field",
                )
              }
            >
              <Code className="size-3.5" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Copy URL"
            title="Copy URL"
            onClick={() => copyToClipboard(item.url, "URL copied")}
          >
            <LinkIcon className="size-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete file"
                title="Delete"
                className="ml-auto"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Any published content still referencing this file will show a
                  broken image or link. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
