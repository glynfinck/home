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
import { adminListCharts } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";

export default async function AdminChartsPage() {
  const charts = await adminListCharts();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Charts</h1>
        <Button asChild size="sm">
          <Link href="/admin/charts/new">
            <Plus className="size-4" /> New chart
          </Link>
        </Button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Figure specs. Drop one into an article with{" "}
        <code>&lt;Chart slug=&quot;…&quot; /&gt;</code>.
      </p>

      <div className="mt-6 space-y-3 sm:hidden">
        {charts.map((chart) => (
          <MobileListCard
            key={chart.id}
            href={`/admin/charts/${chart.id}`}
            title={chart.title}
            slug={chart.slug}
            status={chart.status}
          />
        ))}
        {charts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No charts yet.</p>
        ) : null}
      </div>

      <div className="mt-6 hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Control</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charts.map((chart) => (
              <TableRow key={chart.id}>
                <TableCell>
                  <Link
                    href={`/admin/charts/${chart.id}`}
                    className="font-medium hover:text-brand"
                  >
                    {chart.title}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {chart.slug}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {chart.interactive ? "yes" : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={chart.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(chart.updated_at)}
                </TableCell>
              </TableRow>
            ))}
            {charts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No charts yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
