import Link from "next/link";
import { Plus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileListCard } from "@/components/admin/mobile-list-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { adminListProjects } from "@/lib/data/admin";

export default async function AdminProjectsPage() {
  const projects = await adminListProjects();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <Button asChild size="sm">
          <Link href="/admin/projects/new">
            <Plus className="size-4" /> New project
          </Link>
        </Button>
      </div>

      {/* Mobile: stacked cards */}
      <div className="mt-6 space-y-3 sm:hidden">
        {projects.map((project) => (
          <MobileListCard
            key={project.id}
            href={`/admin/projects/${project.id}`}
            title={project.title}
            slug={project.slug}
            status={project.status}
          >
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">
                Order {project.sort_order}
              </span>
              {project.featured ? (
                <span className="inline-flex items-center gap-1 text-brand">
                  <Star className="size-3 fill-brand text-brand" /> Featured
                </span>
              ) : null}
            </div>
          </MobileListCard>
        ))}
        {projects.length === 0 ? (
          <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
            No projects yet.
          </p>
        ) : null}
      </div>

      {/* Desktop: table */}
      <div className="mt-6 hidden rounded-lg border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Order</TableHead>
              <TableHead className="w-12">Featured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="max-w-72">
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="block truncate font-medium hover:text-brand"
                  >
                    {project.title}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">
                    /{project.slug}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={project.status} />
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {project.sort_order}
                </TableCell>
                <TableCell>
                  {project.featured ? (
                    <Star className="size-4 fill-brand text-brand" />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No projects yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
