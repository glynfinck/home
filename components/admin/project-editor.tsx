"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { DeleteButton } from "@/components/admin/delete-button";
import { TagInput } from "@/components/admin/tag-input";
import { ImageUploadField } from "@/components/admin/upload-fields";
import {
  deleteProject,
  upsertProject,
  type ProjectInput,
} from "@/lib/actions/admin";
import { slugify } from "@/lib/format";

type ProjectFormValues = Omit<ProjectInput, "id"> & { id?: string };

export function ProjectEditor({ initial }: { initial: ProjectFormValues }) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial.id));
  const [pending, startTransition] = React.useTransition();

  function set<K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await upsertProject(values as ProjectInput);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Project saved");
      if (!values.id && result.id) {
        router.replace(`/admin/projects/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {values.id ? "Edit project" : "New project"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {values.id ? (
            <DeleteButton
              label="Project"
              description="The project will be permanently deleted."
              action={() => deleteProject(values.id!)}
              redirectTo="/admin/projects"
            />
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
              onValueChange={(v) => set("status", v as ProjectFormValues["status"])}
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
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            value={values.summary}
            onChange={(e) => set("summary", e.target.value)}
            rows={2}
            placeholder="Card text — one or two sentences."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            rows={5}
            placeholder="Optional longer write-up."
          />
        </div>

        <div className="grid gap-2">
          <Label>Cover image</Label>
          <ImageUploadField
            value={values.cover_image_url}
            onChange={(url) => set("cover_image_url", url)}
            prefix="projects"
          />
        </div>

        <div className="grid gap-2">
          <Label>Tech stack</Label>
          <TagInput
            value={values.tech_stack}
            onChange={(tech) => set("tech_stack", tech)}
            placeholder="Add technology and press Enter"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="github">GitHub URL</Label>
            <Input
              id="github"
              value={values.github_url}
              onChange={(e) => set("github_url", e.target.value)}
              placeholder="https://github.com/…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="live">Live URL</Label>
            <Input
              id="live"
              value={values.live_url}
              onChange={(e) => set("live_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={values.featured}
              onCheckedChange={(checked) => set("featured", checked)}
            />
            Featured on home page
          </label>
          <div className="flex items-center gap-2">
            <Label htmlFor="sort" className="text-sm">
              Sort order
            </Label>
            <Input
              id="sort"
              type="number"
              value={values.sort_order}
              onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
              className="w-20 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
