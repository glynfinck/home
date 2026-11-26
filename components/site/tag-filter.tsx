import { Chip } from "@/components/site/chip";

/**
 * The tag row above a post list. One row serves the blog index and every tag
 * page, with the current filter filled, so moving between tags does not swap
 * the page furniture around.
 */
export function TagFilter({
  tags,
  total,
  active,
}: {
  tags: { tag: string; count: number }[];
  /** Number of posts across all tags, shown on the "all" chip. */
  total: number;
  /** The tag being viewed, or undefined on the unfiltered index. */
  active?: string;
}) {
  if (tags.length === 0) return null;

  return (
    <nav aria-label="Filter posts by tag" className="flex flex-wrap gap-1.5">
      <Chip href="/blog" active={active === undefined}>
        all <Count>{total}</Count>
      </Chip>
      {tags.map(({ tag, count }) => (
        <Chip
          key={tag}
          href={`/blog/tag/${encodeURIComponent(tag)}`}
          active={tag === active}
        >
          {tag} <Count>{count}</Count>
        </Chip>
      ))}
    </nav>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="opacity-60">{children}</span>;
}
