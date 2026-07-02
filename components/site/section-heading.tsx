import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TypedTextInView } from "@/components/site/typed-text-in-view";

export function SectionHeading({
  label,
  title,
  href,
  hrefLabel,
}: {
  label: string;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs tracking-widest text-brand uppercase">
          <TypedTextInView text={label} />
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          {hrefLabel ?? "View all"}
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
