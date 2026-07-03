import { cn } from "@/lib/utils";

/**
 * Server-safe stand-ins for MDX embeds in editor previews.
 *
 * The preview route renders drafts with renderToStaticMarkup, which cannot
 * invoke client components — and every lucide-react icon is one. These
 * mirror the real components' markup with inline SVGs (same lucide paths)
 * so the preview stays pixel-faithful without client imports.
 */

function PreviewIcon({
  paths,
  className,
}: {
  paths: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths}
    </svg>
  );
}

/* lucide path data: info / triangle-alert / lightbulb / file-text */
const ICONS = {
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  warning: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  tip: (
    <>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </>
  ),
  fileText: (
    <>
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
};

/* Mirrors components/site/mdx/callout.tsx */
const CALLOUT_VARIANTS = {
  info: { icon: ICONS.info, className: "border-brand/30 [&_svg]:text-brand" },
  warning: {
    icon: ICONS.warning,
    className: "border-amber-500/30 [&_svg]:text-amber-500",
  },
  tip: { icon: ICONS.tip, className: "border-brand/30 [&_svg]:text-brand" },
} as const;

export function CalloutPreview({
  type = "info",
  children,
}: {
  type?: keyof typeof CALLOUT_VARIANTS;
  children: React.ReactNode;
}) {
  const variant = CALLOUT_VARIANTS[type] ?? CALLOUT_VARIANTS.info;

  return (
    <aside
      className={cn(
        "my-6 flex gap-3 rounded-lg border bg-card px-4 py-3 text-sm leading-relaxed text-card-foreground",
        "[&>div>p]:my-0 [&>div>p+p]:mt-2",
        variant.className,
      )}
    >
      <PreviewIcon paths={variant.icon} className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </aside>
  );
}

/**
 * The real <PaperCard> fetches its paper server-side; a placeholder is
 * enough to check the surrounding layout while writing.
 */
export function PaperCardPreview({ slug }: { slug: string }) {
  return (
    <aside className="not-prose my-8 rounded-lg border border-dashed bg-card p-5">
      <p className="flex items-center gap-2 font-mono text-xs tracking-wide text-brand uppercase">
        <PreviewIcon paths={ICONS.fileText} className="size-3.5" /> Research
        embed
      </p>
      <p className="mt-2 font-mono text-sm text-muted-foreground">
        &lt;PaperCard slug=&quot;{slug}&quot; /&gt; renders on the published
        page
      </p>
    </aside>
  );
}
