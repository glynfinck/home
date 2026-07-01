"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { DeleteButton } from "@/components/admin/delete-button";
import { TagInput } from "@/components/admin/tag-input";
import { ImageUploadField } from "@/components/admin/upload-fields";
import {
  deletePost,
  upsertPost,
  type PostInput,
} from "@/lib/actions/admin";
import { slugify } from "@/lib/format";

type PaperOption = { id: string; title: string };

type PostFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  published_at: string | null;
  paperIds: string[];
};

export function PostEditor({
  initial,
  papers,
}: {
  initial: PostFormValues;
  papers: PaperOption[];
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<PostFormValues>(initial);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial.id));
  const [pending, startTransition] = React.useTransition();

  function set<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await upsertPost(values as PostInput);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Post saved");
      if (!values.id && result.id) {
        router.replace(`/admin/posts/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {values.id ? "Edit post" : "New post"}
        </h1>
        <div className="flex items-center gap-2">
          {values.id ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/posts/${values.id}/preview`} target="_blank">
                  <Eye className="size-4" /> Preview
                </Link>
              </Button>
              <DeleteButton
                label="Post"
                description="The post and its comments will be permanently deleted."
                action={() => deletePost(values.id!)}
                redirectTo="/admin/posts"
              />
            </>
          ) : null}
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? <Spinner /> : null} Save
          </Button>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
            placeholder="Post title"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={values.slug}
              className="font-mono text-sm"
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value) || e.target.value);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={values.status}
              onValueChange={(v) => set("status", v as PostFormValues["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            value={values.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            rows={2}
            placeholder="One or two sentences for cards and SEO."
          />
        </div>

        <div className="grid gap-2">
          <Label>Cover image</Label>
          <ImageUploadField
            value={values.cover_image_url}
            onChange={(url) => set("cover_image_url", url)}
            prefix="covers"
          />
        </div>

        <div className="grid gap-2">
          <Label>Tags</Label>
          <TagInput value={values.tags} onChange={(tags) => set("tags", tags)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="content">
            Content{" "}
            <span className="font-normal text-muted-foreground">
              (MDX — GFM, $math$, &lt;Callout&gt;, &lt;PaperCard slug=&quot;…&quot; /&gt;)
            </span>
          </Label>
          <Textarea
            id="content"
            value={values.content}
            onChange={(e) => set("content", e.target.value)}
            rows={22}
            className="font-mono text-sm leading-relaxed"
            placeholder={"## Heading\n\nWrite MDX here…"}
          />
        </div>

        {papers.length > 0 ? (
          <div className="grid gap-2">
            <Label>Referenced research</Label>
            <div className="space-y-2 rounded-lg border p-4">
              {papers.map((paper) => (
                <label key={paper.id} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={values.paperIds.includes(paper.id)}
                    onCheckedChange={(checked) =>
                      set(
                        "paperIds",
                        checked
                          ? [...values.paperIds, paper.id]
                          : values.paperIds.filter((id) => id !== paper.id),
                      )
                    }
                  />
                  {paper.title}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
