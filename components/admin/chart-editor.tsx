"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DeleteButton } from "@/components/admin/delete-button";
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
import { deleteChart, upsertChart, type ChartInput } from "@/lib/actions/charts";
import { LABEL_EXPRESSIONS } from "@/lib/charts/expr";
import type { ColumnDef } from "@/lib/charts/dataset";
import { slugify } from "@/lib/format";

export type DatasetOption = { slug: string; name: string; columns: ColumnDef[] };

/**
 * Chart editor: a starter form for the common cases, a raw spec editor for
 * everything else, and a live preview rendered by the real renderer.
 *
 * The stored spec is Vega-Lite, verbatim. The form writes one rather than
 * standing in front of it, so nothing the grammar can express is out of reach
 * and there is no house schema to keep in step with it.
 */
export function ChartEditor({
  initial,
  datasets,
}: {
  initial: ChartInput;
  datasets: DatasetOption[];
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<ChartInput>(initial);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial.slug));
  const [pending, startTransition] = React.useTransition();
  const [preview, setPreview] = React.useState<string | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  function set<K extends keyof ChartInput>(key: K, value: ChartInput[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  // Debounced so typing in the spec box does not fire a render per keystroke.
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      let spec: unknown;
      try {
        spec = JSON.parse(values.spec);
      } catch (error) {
        setPreviewError(
          error instanceof Error ? error.message : "Invalid JSON",
        );
        return;
      }

      try {
        const response = await fetch("/admin/chart-preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ spec, bindings: values.bindings }),
        });
        const body = (await response.json()) as { svg?: string; error?: string };
        if (!response.ok) {
          setPreviewError(body.error ?? "Could not render");
          return;
        }
        setPreview(body.svg ?? null);
        setPreviewError(null);
      } catch {
        setPreviewError("Preview request failed");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [values.spec, values.bindings]);

  function save() {
    startTransition(async () => {
      const result = await upsertChart(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Chart saved");
      if (!values.id && result.id) router.replace(`/admin/charts/${result.id}`);
      else router.refresh();
    });
  }

  const bindings = Object.entries(values.bindings);
  const mainDataset = datasets.find(
    (dataset) => dataset.slug === values.bindings.main?.slug,
  );

  function applyStarter(mark: "line" | "bar" | "area" | "point") {
    if (!mainDataset) {
      toast.error("Bind a dataset named `main` first");
      return;
    }
    const [first, second] = mainDataset.columns;
    if (!first || !second) {
      toast.error("That dataset needs at least two columns");
      return;
    }

    const vlType = (column: ColumnDef) =>
      column.type === "number" || column.type === "integer"
        ? "quantitative"
        : column.type === "date"
          ? "temporal"
          : "nominal";

    const axis = (column: ColumnDef) => {
      const expression =
        column.format && column.format in LABEL_EXPRESSIONS
          ? LABEL_EXPRESSIONS[column.format as keyof typeof LABEL_EXPRESSIONS]
          : undefined;
      return {
        title: column.label,
        ...(expression ? { labelExpr: expression } : {}),
      };
    };

    set(
      "spec",
      JSON.stringify(
        {
          $schema: "https://vega.github.io/schema/vega-lite/v6.json",
          data: { name: "main" },
          mark: mark === "bar" ? { type: "bar", size: 24 } : { type: mark },
          encoding: {
            x: {
              field: first.key,
              type: vlType(first),
              axis: { ...axis(first), grid: false },
            },
            y: {
              field: second.key,
              type: vlType(second),
              axis: { ...axis(second), grid: true },
            },
          },
        },
        null,
        2,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {values.id ? values.title || "Chart" : "New chart"}
        </h1>
        <div className="flex items-center gap-2">
          {values.id ? (
            <DeleteButton
              label="Chart"
              description="Any article still referencing this slug will show a placeholder."
              action={() => deleteChart(values.id!)}
              redirectTo="/admin/charts"
            />
          ) : null}
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? <Spinner /> : null} Save
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={values.title}
            onChange={(event) => {
              set("title", event.target.value);
              if (!slugTouched) set("slug", slugify(event.target.value));
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={values.slug}
            onChange={(event) => {
              setSlugTouched(true);
              set("slug", event.target.value);
            }}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Used in MDX as <code>&lt;Chart slug=&quot;{values.slug || "…"}&quot; /&gt;</code>
          </p>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="caption">Caption</Label>
          <Textarea
            id="caption"
            rows={2}
            value={values.caption}
            onChange={(event) => set("caption", event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            A caption written in the MDX overrides this one.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) => set("status", value as ChartInput["status"])}
          >
            <SelectTrigger id="status">
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

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Datasets</h2>
            <p className="text-sm text-muted-foreground">
              The name is what the spec refers to: <code>{"{ name: 'main' }"}</code>.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setValues((previous) => ({
                ...previous,
                bindings: {
                  ...previous.bindings,
                  [`data${Object.keys(previous.bindings).length + 1}`]: {
                    slug: datasets[0]?.slug ?? "",
                    version: null,
                  },
                },
              }))
            }
          >
            <Plus className="size-4" /> Bind
          </Button>
        </div>

        {bindings.map(([name, binding]) => (
          <div key={name} className="flex flex-wrap items-center gap-2">
            <Input
              value={name}
              onChange={(event) =>
                setValues((previous) => {
                  const next = { ...previous.bindings };
                  delete next[name];
                  next[event.target.value] = binding;
                  return { ...previous, bindings: next };
                })
              }
              className="h-9 w-40 font-mono"
            />
            <Select
              value={binding.slug}
              onValueChange={(slug) =>
                setValues((previous) => ({
                  ...previous,
                  bindings: {
                    ...previous.bindings,
                    [name]: { ...binding, slug },
                  },
                }))
              }
            >
              <SelectTrigger className="h-9 w-72">
                <SelectValue placeholder="Choose a dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.slug} value={dataset.slug}>
                    {dataset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setValues((previous) => {
                  const next = { ...previous.bindings };
                  delete next[name];
                  return { ...previous, bindings: next };
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {mainDataset ? (
          <p className="font-mono text-xs text-muted-foreground">
            main: {mainDataset.columns.map((column) => column.key).join(", ")}
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">Spec</h2>
            <span className="text-xs text-muted-foreground">start from</span>
            {(["line", "bar", "area", "point"] as const).map((mark) => (
              <Button
                key={mark}
                size="sm"
                variant="outline"
                onClick={() => applyStarter(mark)}
              >
                {mark}
              </Button>
            ))}
          </div>
          <Textarea
            value={values.spec}
            onChange={(event) => set("spec", event.target.value)}
            rows={26}
            spellCheck={false}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Vega-Lite v6. Size, padding, fonts and colours come from the site
            config, so a spec should not set them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Preview</h2>
          {previewError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs break-words text-destructive">
              {previewError}
            </p>
          ) : null}
          {preview ? (
            <div
              className="overflow-x-auto rounded-lg border bg-card/40 p-2 [&>svg]:h-auto [&>svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              The preview renders here.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
