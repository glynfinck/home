import Image from "next/image";

import type { Project } from "@/lib/data/projects";
import { PLATE, plateKind, plateShapes, type PlateShape } from "@/lib/plate";
import { cn } from "@/lib/utils";

const TONE = {
  brand: "var(--brand)",
  dim: "var(--muted-foreground)",
  fg: "var(--foreground)",
} as const;
const FILL = { ...TONE, surface: "var(--background)", none: "none" } as const;

/**
 * A project's cover: its uploaded image when it has one, otherwise a plate
 * generated from its subject (see `lib/plate.ts`), so a grid of projects is
 * never a grid of text boxes with one screenshot in it.
 *
 * Decorative either way. The card's title names the project, and a plate
 * carries no information, so both are hidden from assistive technology.
 */
export function ProjectCover({
  project,
  sizes,
  className,
  priority,
  fit = "slice",
}: {
  project: Pick<
    Project,
    "slug" | "title" | "summary" | "tech_stack" | "cover_image_url"
  >;
  /** `sizes` for an uploaded image; depends on where the cover is placed. */
  sizes: string;
  className?: string;
  /** Above the fold (the project page's banner): load it straight away. */
  priority?: boolean;
  /**
   * How a drawn plate fills its box. `slice` (cards) fills it and crops;
   * `meet` (the page banner) keeps the whole drawing at a readable scale,
   * centred, so it is not blown up to the width of the page.
   */
  fit?: "slice" | "meet";
}) {
  if (project.cover_image_url) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image
          src={project.cover_image_url}
          priority={priority}
          alt=""
          fill
          sizes={sizes}
          className="object-cover object-top"
        />
      </div>
    );
  }

  const shapes = plateShapes(plateKind(project), project.slug);

  return (
    <div className={cn("overflow-hidden bg-background", className)}>
      <svg
        aria-hidden
        viewBox={`0 0 ${PLATE.width} ${PLATE.height}`}
        // Both keep the drawing's proportions: `slice` crops the overflow,
        // `meet` leaves margin round it.
        preserveAspectRatio={`xMidYMid ${fit}`}
        className="block size-full"
      >
        {shapes.map((shape, i) => (
          <Shape key={i} shape={shape} />
        ))}
      </svg>
    </div>
  );
}

function Shape({ shape }: { shape: PlateShape }) {
  if (shape.type === "rect") {
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        rx={shape.radius ?? 1.5}
        fill={FILL[shape.fill]}
        stroke={shape.stroke ? TONE[shape.stroke] : undefined}
        strokeWidth={shape.stroke ? (shape.width ?? 1.5) : undefined}
        opacity={shape.opacity}
      />
    );
  }
  if (shape.type === "circle") {
    return (
      <circle
        cx={shape.cx}
        cy={shape.cy}
        r={shape.r}
        fill={FILL[shape.fill]}
        stroke={shape.stroke ? TONE[shape.stroke] : undefined}
        strokeWidth={shape.stroke ? (shape.width ?? 1.5) : undefined}
        opacity={shape.opacity}
      />
    );
  }
  if (shape.type === "path") {
    return (
      <path
        d={shape.d}
        fill={FILL[shape.fill]}
        stroke={shape.stroke ? TONE[shape.stroke] : undefined}
        strokeWidth={shape.stroke ? (shape.width ?? 1.5) : undefined}
        strokeDasharray={shape.dash}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={shape.opacity}
      />
    );
  }
  if (shape.type === "text") {
    return (
      <text
        x={shape.x}
        y={shape.y}
        fill={TONE[shape.tone]}
        fontSize={shape.size}
        textAnchor={shape.anchor}
        opacity={shape.opacity}
        className="font-mono"
      >
        {shape.text}
      </text>
    );
  }
  return (
    <polyline
      points={shape.points.map(([x, y]) => `${x},${y}`).join(" ")}
      fill="none"
      stroke={TONE[shape.tone]}
      strokeWidth={shape.width}
      strokeDasharray={shape.dash}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={shape.opacity}
    />
  );
}
