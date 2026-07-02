import Link from "next/link";
import { Eye, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { adminListPosts } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";

export default async function AdminPostsPage() {
  const posts = await adminListPosts();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
        <Button asChild size="sm">
          <Link href="/admin/posts/new">
            <Plus className="size-4" /> New post
          </Link>
        </Button>
      </div>

      {/* Mobile: stacked cards */}
      <div className="mt-6 space-y-3 sm:hidden">
        {posts.map((post) => (
          <MobileListCard
            key={post.id}
            href={`/admin/posts/${post.id}`}
            title={post.title}
            slug={post.slug}
            status={post.status}
          >
            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="font-mono text-[10px]"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">
                {post.view_count} views
              </span>
              <span className="font-mono">
                {formatDate(post.published_at) || "—"}
              </span>
            </div>
          </MobileListCard>
        ))}
        {posts.length === 0 ? (
          <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
            No posts yet — write the first one.
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
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Published</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="max-w-64">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="block truncate font-medium hover:text-brand"
                  >
                    {post.title}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">
                    /{post.slug}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={post.status} />
                </TableCell>
                <TableCell>
                  <div className="flex max-w-40 flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="font-mono text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {post.view_count}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {formatDate(post.published_at) || "—"}
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="sm" aria-label="Preview">
                    <Link href={`/admin/posts/${post.id}/preview`} target="_blank">
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No posts yet — write the first one.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
