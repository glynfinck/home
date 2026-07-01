import "katex/dist/katex.min.css";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { adminGetPost } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";
import { Mdx } from "@/lib/mdx";

/** Full-fidelity draft preview — same MDX pipeline as the public page. */
export default async function PostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await adminGetPost(id);
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-2 py-8">
      <div className="mb-6 flex items-center justify-between rounded-lg border border-dashed border-brand/40 bg-brand/5 px-4 py-2">
        <p className="font-mono text-xs text-brand">
          preview · {post.status}
        </p>
        <Link
          href={`/admin/posts/${post.id}`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Back to editor
        </Link>
      </div>

      <header>
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
          <time>{formatDate(post.published_at) || "unpublished"}</time>
          {post.reading_minutes ? <span>· {post.reading_minutes} min read</span> : null}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}
        {post.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-10 border-t border-border/60 pt-10">
        <Mdx source={post.content} />
      </div>
    </article>
  );
}
