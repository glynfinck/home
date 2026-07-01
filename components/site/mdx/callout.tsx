import { AlertTriangle, Info, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  info: {
    icon: Info,
    className: "border-brand/30 [&_svg]:text-brand",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/30 [&_svg]:text-amber-500",
  },
  tip: {
    icon: Lightbulb,
    className: "border-brand/30 [&_svg]:text-brand",
  },
} as const;

export function Callout({
  type = "info",
  children,
}: {
  type?: keyof typeof VARIANTS;
  children: React.ReactNode;
}) {
  const variant = VARIANTS[type] ?? VARIANTS.info;
  const Icon = variant.icon;

  return (
    <aside
      className={cn(
        "my-6 flex gap-3 rounded-lg border bg-card px-4 py-3 text-sm leading-relaxed text-card-foreground",
        "[&>div>p]:my-0 [&>div>p+p]:mt-2",
        variant.className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </aside>
  );
}
