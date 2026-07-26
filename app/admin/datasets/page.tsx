import Link from "next/link";
import { Plus } from "lucide-react";

import { MobileListCard } from "@/components/admin/mobile-list-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListDatasets } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";

export default async function AdminDatasetsPage() {
  const datasets = await adminListDatasets();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Datasets</h1>
        <Button asChild size="sm">
          <Link href="/admin/datasets/new">
            <Plus className="size-4" /> New dataset
          </Link>
        </Button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        The tables figures are drawn from. Import a CSV or JSON file and every
        chart bound to the dataset picks it up.
      </p>

      <div className="mt-6 space-y-3 sm:hidden">
        {datasets.map((dataset) => (
          <MobileListCard
            key={dataset.id}
            href={`/admin/datasets/${dataset.id}`}
            title={dataset.name}
            slug={dataset.slug}
            status={dataset.status}
          >
            <span className="tabular-nums">
              {dataset.rowCount.toLocaleString("en-US")} rows
            </span>
          </MobileListCard>
        ))}
        {datasets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No datasets yet — import the first one.
          </p>
        ) : null}
      </div>

      <div className="mt-6 hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead className="text-right">Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datasets.map((dataset) => (
              <TableRow key={dataset.id}>
                <TableCell>
                  <Link
                    href={`/admin/datasets/${dataset.id}`}
                    className="font-medium hover:text-brand"
                  >
                    {dataset.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {dataset.slug}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dataset.rowCount.toLocaleString("en-US")}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {dataset.currentVersion ?? "—"}
                  {dataset.versionCount > 1 ? (
                    <span className="text-xs"> of {dataset.versionCount}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusBadge status={dataset.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(dataset.updated_at)}
                </TableCell>
              </TableRow>
            ))}
            {datasets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No datasets yet — import the first one.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
