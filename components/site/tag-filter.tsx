import { Chip } from "@/components/site/chip";
import { TagIcon } from "@/components/site/tag-icon";
import { TagRow } from "@/components/site/tag-row";
import { getTagIconMap } from "@/lib/data/tag-kinds";
import type { TagCount } from "@/lib/data/posts";

/**
 * The tag rows above a post list. One block serves the blog index and every
 * tag page, with the current filter filled, so moving between tags does not
 * swap the page furniture around. Topics and technologies get a row each;
 * technologies carry their logo.
 */
export async function TagFilter({
  tags,
  total,
  active,
}: {
  tags: TagCount[];
  /** Number of posts across all tags, shown on the "all" chip. */
  total: number;
  /** The tag being viewed, or undefined on the unfiltered index. */
  active?: string;
}) {
  if (tags.length === 0) return null;

  const uploaded = await getTagIconMap();
  const topicTags = tags.filter((tag) => !tag.stack);
  const stackTags = tags.filter((tag) => tag.stack);

  const chip = ({ tag, count, stack }: TagCount) => (
    <Chip
      key={tag}
      href={`/blog/tag/${encodeURIComponent(tag)}`}
      active={tag === active}
    >
      {stack ? <TagIcon tag={tag} uploaded={uploaded} /> : null}
      {tag} <Count>{count}</Count>
    </Chip>
  );

  return (
    <nav aria-label="Filter posts by tag" className="space-y-2">
      <TagRow label="topics">
        <Chip href="/blog" active={active === undefined}>
          all <Count>{total}</Count>
        </Chip>
        {topicTags.map(chip)}
      </TagRow>
      {stackTags.length > 0 ? (
        <TagRow label="stack">{stackTags.map(chip)}</TagRow>
      ) : null}
    </nav>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="opacity-60">{children}</span>;
}
