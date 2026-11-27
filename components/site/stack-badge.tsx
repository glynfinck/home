import { Chip } from "@/components/site/chip";
import { TagIcon } from "@/components/site/tag-icon";

/**
 * Tech-stack chip with the technology's logo. Uploaded kinds (`tag_kinds`)
 * win over the built-in logos; pass the whole map and the chip resolves its
 * own icon.
 */
export function StackBadge({
  tag,
  tagIcons,
}: {
  tag: string;
  tagIcons?: Record<string, string>;
}) {
  return (
    <Chip>
      <TagIcon tag={tag} uploaded={tagIcons} />
      {tag}
    </Chip>
  );
}
