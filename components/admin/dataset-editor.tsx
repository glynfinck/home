"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Upload } from "lucide-react";
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
import {
  COLUMN_FORMATS,
  COLUMN_TYPES,
  type ColumnDef,
  type DatasetPayload,
} from "@/lib/charts/dataset";
import { formatCell } from "@/lib/charts/format";
import { IMPORT_ACCEPT, draftToPayload, parseImport, type ImportDraft } from "@/lib/charts/import";
import {
  deleteDataset,
  importDatasetVersion,
  rollbackDataset,
  upsertDataset,
  type DatasetInput,
} from "@/lib/actions/charts";
import { formatDate, slugify } from "@/lib/format";

type VersionRow = {
  id: string;
  version: number;
  row_count: number;
  checksum: string;
  source_name: string | null;
  note: string | null;
  created_at: string;
};

/**
 * Dataset editor: metadata, a file import with a column mapping step, and the
 * version history.
 *
 * Parsing happens here in the browser rather than on the server, so the
 * mapping grid can be corrected before anything is written. Nothing is stored
 * until the import is confirmed.
 */
export function DatasetEditor({
  initial,
  versions = [],
  current,
  usedBy = [],
}: {
  initial: DatasetInput;
  versions?: VersionRow[];
  current?: { id: string; version: number; payload: DatasetPayload } | null;
  usedBy?: { id: string; slug: string; title: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<DatasetInput>(initial);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial.slug));
  const [pending, startTransition] = React.useTransition();
  const [draft, setDraft] = React.useState<ImportDraft | null>(null);
  const [draftColumns, setDraftColumns] = React.useState<ColumnDef[]>([]);
  const [fileName, setFileName] = React.useState("");

  function set<K extends keyof DatasetInput>(key: K, value: DatasetInput[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await upsertDataset(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Dataset saved");
      if (!values.id && result.id) router.replace(`/admin/datasets/${result.id}`);
      else router.refresh();
    });
  }

  async function onFile(file: File) {
    try {
      const text = await file.text();
      const parsed = parseImport(text, file.name);
      setDraft(parsed);
      setDraftColumns(parsed.columns);
      setFileName(file.name);
      for (const warning of parsed.warnings) toast.warning(warning);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the file");
    }
  }

  function confirmImport() {
    if (!draft || !values.id) return;
    startTransition(async () => {
      let payload: DatasetPayload;
      try {
        payload = draftToPayload(draft, draftColumns);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Invalid columns");
        return;
      }

      const result = await importDatasetVersion({
        datasetId: values.id!,
        payload,
        sourceName: fileName,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Imported");
      setDraft(null);
      router.refresh();
    });
  }

  const preview = draft ?? (current ? { ...current.payload, rowCount: 0, warnings: [] } : null);
  const previewColumns = draft ? draftColumns : (current?.payload.columns ?? []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {values.id ? values.name || "Dataset" : "New dataset"}
        </h1>
        <div className="flex items-center gap-2">
          {values.id ? (
            <DeleteButton
              label="Dataset"
              description="Charts bound to this dataset will refuse the delete."
              action={() => deleteDataset(values.id!)}
              redirectTo="/admin/datasets"
            />
          ) : null}
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? <Spinner /> : null} Save
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={values.name}
            onChange={(event) => {
              set("name", event.target.value);
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
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={2}
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            value={values.source}
            onChange={(event) => set("source", event.target.value)}
            placeholder="Kraken spot, 1-min bars"
          />
          <p className="text-xs text-muted-foreground">
            Printed under every figure drawn from this dataset.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) =>
              set("status", value as DatasetInput["status"])
            }
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
          <p className="text-xs text-muted-foreground">
            Only published datasets are readable by the public site.
          </p>
        </div>
      </div>

      {values.id ? (
        <section className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium">Data</h2>
              <p className="text-sm text-muted-foreground">
                CSV, TSV, JSON rows, JSON columns or NDJSON. Identical data is
                not re-imported.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <label className="cursor-pointer">
                <Upload className="size-4" /> Choose file
                <input
                  type="file"
                  accept={IMPORT_ACCEPT}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onFile(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </Button>
          </div>

          {draft ? (
            <div className="space-y-3 rounded-md border border-brand/40 bg-brand/5 p-3">
              <p className="text-sm">
                <span className="font-mono text-xs">{fileName}</span> parsed:{" "}
                {draft.rowCount.toLocaleString("en-US")} rows,{" "}
                {draftColumns.length} columns.
              </p>

              <div className="space-y-2">
                {draftColumns.map((column, index) => (
                  <div key={column.key} className="flex flex-wrap items-center gap-2">
                    <code className="w-40 shrink-0 truncate font-mono text-xs">
                      {column.key}
                    </code>
                    <Input
                      value={column.label}
                      onChange={(event) =>
                        setDraftColumns((columns) =>
                          columns.map((c, i) =>
                            i === index ? { ...c, label: event.target.value } : c,
                          ),
                        )
                      }
                      className="h-8 w-44"
                    />
                    <Select
                      value={column.type}
                      onValueChange={(value) =>
                        setDraftColumns((columns) =>
                          columns.map((c, i) =>
                            i === index
                              ? { ...c, type: value as ColumnDef["type"] }
                              : c,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMN_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={column.format ?? "plain"}
                      onValueChange={(value) =>
                        setDraftColumns((columns) =>
                          columns.map((c, i) =>
                            i === index
                              ? { ...c, format: value as ColumnDef["format"] }
                              : c,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMN_FORMATS.map((format) => (
                          <SelectItem key={format} value={format}>
                            {format}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDraftColumns((columns) =>
                          columns.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Drop
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={confirmImport} disabled={pending}>
                  {pending ? <Spinner /> : null} Import
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {preview && previewColumns.length > 0 ? (
            <PreviewGrid
              columns={previewColumns}
              data={draft ? draft.data : (current?.payload.data ?? {})}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No data yet. Import a file to create version 1.
            </p>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Save the dataset first, then import its data.
        </p>
      )}

      {versions.length > 0 ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-medium">Versions</h2>
          <ul className="space-y-2 text-sm">
            {versions.map((version) => {
              const isCurrent = version.id === current?.id;
              return (
                <li
                  key={version.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs">v{version.version}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {version.row_count.toLocaleString("en-US")} rows
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(version.created_at)}
                    </span>
                    {version.source_name ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {version.source_name}
                      </span>
                    ) : null}
                  </span>
                  {isCurrent ? (
                    <span className="font-mono text-xs text-brand">serving</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await rollbackDataset(
                            values.id!,
                            version.id,
                          );
                          if (!result.ok) toast.error(result.error);
                          else {
                            toast.success(result.message ?? "Switched");
                            router.refresh();
                          }
                        })
                      }
                    >
                      <RotateCcw className="size-3.5" /> Serve this
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {usedBy.length > 0 ? (
        <section className="space-y-2 rounded-lg border p-4">
          <h2 className="font-medium">Used by</h2>
          <ul className="space-y-1 text-sm">
            {usedBy.map((chart) => (
              <li key={chart.id}>
                <a
                  href={`/admin/charts/${chart.id}`}
                  className="hover:text-brand"
                >
                  {chart.title}
                </a>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {chart.slug}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** First rows of a payload, formatted the way the published table will be. */
function PreviewGrid({
  columns,
  data,
}: {
  columns: ColumnDef[];
  data: Record<string, (string | number | boolean | null)[]>;
}) {
  const rows = Math.min(data[columns[0]?.key]?.length ?? 0, 8);

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/40">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-medium">
                {column.label}
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  {column.type}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i} className="border-t border-border/40">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-1.5 tabular-nums">
                  {formatCell(data[column.key]?.[i] ?? null, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
