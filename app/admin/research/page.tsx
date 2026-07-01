import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { adminListPapers } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";

export default async function AdminResearchPage() {
  const papers = await adminListPapers();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Research</h1>
        <Button asChild size="sm">
          <Link href="/admin/research/new">
            <Plus className="size-4" /> New paper
          </Link>
        </Button>
      </div>

      <div className="mt-6 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Downloads</TableHead>
              <TableHead className="text-right">Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {papers.map((paper) => (
              <TableRow key={paper.id}>
                <TableCell className="max-w-72">
                  <Link
                    href={`/admin/research/${paper.id}`}
                    className="block truncate font-medium hover:text-brand"
                  >
                    {paper.title}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">
                    /{paper.slug}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={paper.status} />
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {paper.download_count}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {formatDate(paper.published_at) || "—"}
                </TableCell>
              </TableRow>
            ))}
            {papers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No papers yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
