"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
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
import { MAX_HIGHLIGHTS, type Highlight } from "@/lib/highlights";

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

        <HighlightsField
          value={values.highlights}
          onChange={(highlights) => set("highlights", highlights)}
        />

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

/**
 * The paper's headline numbers: label, the figure as it should read, and
 * whether it is the one that went against the hypothesis (drawn in amber).
 */
function HighlightsField({
  value,
  onChange,
}: {
  value: Highlight[];
  onChange: (value: Highlight[]) => void;
}) {
  function update(index: number, patch: Partial<Highlight>) {
    onChange(value.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  return (
    <div className="grid gap-2">
      <Label>
        Headline numbers{" "}
        <span className="font-normal text-muted-foreground">
          (up to {MAX_HIGHLIGHTS}, shown on the card and above the abstract)
        </span>
      </Label>
      {value.map((highlight, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input
            value={highlight.label}
            placeholder="Break-even fee"
            className="w-full sm:flex-1"
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <Input
            value={highlight.value}
            placeholder="14.3 bps"
            className="flex-1 font-mono sm:w-32 sm:flex-none"
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <Select
            value={highlight.tone}
            onValueChange={(tone) =>
              update(i, { tone: tone as Highlight["tone"] })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Remove number"
            className="shrink-0"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      {value.length < MAX_HIGHLIGHTS ? (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange([...value, { label: "", value: "", tone: "neutral" }])
            }
          >
            <Plus className="size-4" /> Add number
          </Button>
        </div>
      ) : null}
    </div>
  );
}
