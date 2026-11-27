"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { deleteTagKind, upsertTagKind } from "@/lib/actions/admin";
import {
  MEDIA_IMAGE_ACCEPT,
  mediaPathFromPublicUrl,
  uploadToMediaBucket,
} from "@/lib/media";
import type { Tables } from "@/types/helpers";

type TagKind = Tables<"tag_kinds">;

/** Best-effort cleanup of a replaced/deleted icon file under media/kinds/. */
function removeIconFile(url: string) {
  const path = mediaPathFromPublicUrl(url);
  if (!path?.startsWith("kinds/")) return;
  void createClient().storage.from("media").remove([path]);
}

/** The icon as the site draws it: mono marks take the text colour. */
function IconPreview({ url, mono = false }: { url: string; mono?: boolean }) {
  const mask = `url("${url}") center / contain no-repeat`;
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/20 p-1.5">
      {mono ? (
        <span
          aria-hidden
          className="size-full bg-foreground"
          style={{ mask, WebkitMask: mask }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-contain" />
      )}
    </div>
  );
}

/** "kdb, q,  kdb+" → ["kdb", "q", "kdb+"] */
function parseAliases(text: string): string[] {
  return [
    ...new Set(
      text
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function KindManager({
  kinds,
  contentTags,
}: {
  kinds: TagKind[];
  contentTags: string[];
}) {
  const router = useRouter();
  const mapped = new Set(kinds.map((kind) => kind.name));
  const unmapped = contentTags.filter((tag) => !mapped.has(tag));

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Tag icons</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every technology logo on the site comes from here. Pick a tag
        that&apos;s in use and upload a small square icon (SVG works best).
        Turn on <span className="font-medium text-foreground">Mono</span> for
        black logos so they follow the text colour in dark mode, and add
        aliases for other spellings of the same technology (kdb, q). Uploads
        live in the public media bucket under{" "}
        <code className="font-mono text-xs">kinds/</code>.
      </p>

      <AddKindForm unmapped={unmapped} onSaved={() => router.refresh()} />

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">
          Mapped tags
        </h2>
        {kinds.length === 0 ? (
          <p className="mt-3 rounded-lg border p-6 text-center text-sm text-muted-foreground">
            No tag icons yet — map one above.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {kinds.map((kind) => (
              <KindRow
                // Re-mounts the row when saved aliases change, resetting its input
                key={`${kind.id}:${kind.aliases.join(",")}`}
                kind={kind}
                onChanged={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AddKindForm({
  unmapped,
  onSaved,
}: {
  unmapped: string[];
  onSaved: () => void;
}) {
  const [tag, setTag] = React.useState("");
  const [iconUrl, setIconUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    try {
      const url = await uploadToMediaBucket(file, "kinds");
      // Swapping the icon before saving orphans the previous upload — drop it
      if (iconUrl) removeIconFile(iconUrl);
      setIconUrl(url);
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  function save() {
    startTransition(async () => {
      const result = await upsertTagKind({ name: tag, icon_url: iconUrl });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Icon mapped to “${tag}”`);
      setTag("");
      setIconUrl("");
      onSaved();
    });
  }

  return (
    <div className="mt-6 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 flex-1 gap-2">
          <Label>Tag</Label>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="font-mono text-sm">
              <SelectValue
                placeholder={
                  unmapped.length > 0
                    ? "Pick a tag in use"
                    : "All tags in use have icons"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {unmapped.map((t) => (
                <SelectItem key={t} value={t} className="font-mono text-sm">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
        <div className="flex items-center gap-2">
          {iconUrl ? <IconPreview url={iconUrl} /> : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Spinner /> : <ImageUp className="size-4" />}
            {iconUrl ? "Replace icon" : "Upload icon"}
          </Button>
        </div>

        <Button
          size="sm"
          disabled={pending || uploading || !tag || !iconUrl}
          onClick={save}
        >
          {pending ? <Spinner /> : <Plus className="size-4" />} Add
        </Button>
      </div>
      {unmapped.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Tags come from project stacks, post tags, and paper topics — add one
          there first, then map its icon here.
        </p>
      ) : null}
    </div>
  );
}

function KindRow({
  kind,
  onChanged,
}: {
  kind: TagKind;
  onChanged: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [aliases, setAliases] = React.useState(kind.aliases.join(", "));
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function save(
    patch: Partial<Pick<TagKind, "icon_url" | "mono" | "aliases">>,
  ) {
    return upsertTagKind({
      id: kind.id,
      name: kind.name,
      icon_url: kind.icon_url,
      mono: kind.mono,
      aliases: kind.aliases,
      ...patch,
    });
  }

  async function replaceIcon(file: File) {
    setBusy(true);
    try {
      const url = await uploadToMediaBucket(file, "kinds");
      const result = await save({ icon_url: url });
      if (!result.ok) {
        removeIconFile(url);
        toast.error(result.error);
        return;
      }
      removeIconFile(kind.icon_url);
      toast.success("Icon replaced");
      onChanged();
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function setMono(mono: boolean) {
    setBusy(true);
    const result = await save({ mono });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  async function saveAliases() {
    const next = parseAliases(aliases);
    if (next.join(",") === kind.aliases.join(",")) return;
    setBusy(true);
    const result = await save({ aliases: next });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Aliases saved for “${kind.name}”`);
    onChanged();
  }

  async function remove() {
    setBusy(true);
    const result = await deleteTagKind(kind.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeIconFile(kind.icon_url);
    toast.success("Tag icon deleted");
    onChanged();
  }

  const monoId = `mono-${kind.id}`;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <IconPreview url={kind.icon_url} mono={kind.mono} />
        <span className="min-w-0 truncate font-mono text-sm">{kind.name}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <div className="mr-1 flex items-center gap-1.5">
            <Switch
              id={monoId}
              checked={kind.mono}
              disabled={busy}
              onCheckedChange={(checked) => void setMono(checked)}
            />
            <Label
              htmlFor={monoId}
              className="text-xs font-normal text-muted-foreground"
            >
              Mono
            </Label>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={MEDIA_IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void replaceIcon(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            aria-label={`Replace icon for ${kind.name}`}
            title="Replace icon"
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Spinner /> : <ImageUp className="size-3.5" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                aria-label={`Delete icon for ${kind.name}`}
                title="Delete"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete the “{kind.name}” icon?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Badges for this tag and its aliases go back to plain text.
                  An uploaded icon file is removed from the media bucket.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void remove()}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <Input
        aria-label={`Aliases for ${kind.name}`}
        placeholder="Aliases, comma separated"
        value={aliases}
        disabled={busy}
        onChange={(e) => setAliases(e.target.value)}
        onBlur={() => void saveAliases()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="mt-2 h-8 font-mono text-xs"
      />
    </div>
  );
}
