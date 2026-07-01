import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] uppercase",
        status === "published" && "border-brand/40 text-brand",
        status === "draft" && "text-muted-foreground",
        status === "archived" && "border-border text-muted-foreground line-through",
      )}
    >
      {status}
    </Badge>
  );
}
