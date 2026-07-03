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
import { Textarea } from "@/components/ui/textarea";
import { DeleteButton } from "@/components/admin/delete-button";
import { MdxField } from "@/components/admin/mdx-field";
import { TagPicker, type TagOption } from "@/components/admin/tag-picker";
import { PdfUploadField } from "@/components/admin/upload-fields";
import {
  deletePaper,
  upsertPaper,
  type PaperInput,
} from "@/lib/actions/admin";
import { slugify } from "@/lib/format";

type PaperFormValues = Omit<PaperInput, "id"> & { id?: string };

export function PaperEditor({
  initial,
  tagOptions,
}: {
  initial: PaperFormValues;
  tagOptions: TagOption[];
}) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial.id));
  const [pending, startTransition] = React.useTransition();

  function set<K extends keyof PaperFormValues>(
    key: K,
    value: PaperFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await upsertPaper(values as PaperInput);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Paper saved");
      if (!values.id && result.id) {
        router.replace(`/admin/research/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {values.id ? "Edit paper" : "New paper"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {values.id ? (
            <DeleteButton
              label="Paper"
              description="The paper metadata will be permanently deleted (the PDF stays in storage)."
              action={() => deletePaper(values.id!)}
              redirectTo="/admin/research"
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
              onValueChange={(v) => set("status", v as PaperFormValues["status"])}
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
          <Label htmlFor="abstract">Abstract</Label>
          <Textarea
            id="abstract"
            value={values.abstract}
            onChange={(e) => set("abstract", e.target.value)}
            rows={4}
            placeholder="Shown on the research card and paper page."
          />
        </div>

        <div className="grid gap-2">
          <Label>PDF</Label>
          <PdfUploadField
            path={values.pdf_path}
            sizeBytes={values.pdf_size_bytes}
            onChange={(path, size) => {
              set("pdf_path", path);
              set("pdf_size_bytes", size);
            }}
            prefix="papers"
          />
        </div>

        <div className="grid gap-2">
          <Label>Topics</Label>
          <TagPicker
            value={values.topics}
            onChange={(topics) => set("topics", topics)}
            options={tagOptions}
            placeholder="Search topics or type a new one"
          />
        </div>

        <MdxField
          id="content"
          label={
            <>
              Web write-up{" "}
              <span className="font-normal text-muted-foreground">
                (optional MDX, shown on the paper page)
              </span>
            </>
          }
          value={values.content}
          onChange={(content) => set("content", content)}
        />
      </div>
    </div>
  );
}
