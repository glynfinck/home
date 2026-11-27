import Image from "next/image";

import type { Project } from "@/lib/data/projects";
import { PLATE, plateKind, plateShapes, type PlateShape } from "@/lib/plate";
import { cn } from "@/lib/utils";

const TONE = { brand: "var(--brand)", dim: "var(--muted-foreground)" } as const;
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
}: {
  project: Pick<
    Project,
    "slug" | "title" | "summary" | "tech_stack" | "cover_image_url"
  >;
  /** `sizes` for an uploaded image; depends on where the cover is placed. */
  sizes: string;
  className?: string;
}) {
  if (project.cover_image_url) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image
          src={project.cover_image_url}
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
        // `slice` keeps the drawing's proportions and crops the overflow, so
        // one plate fills a card and a wide banner alike.
        preserveAspectRatio="xMidYMid slice"
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
        rx={1.5}
        fill={TONE[shape.fill]}
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
        strokeWidth={shape.stroke ? 1.5 : undefined}
        opacity={shape.opacity}
      />
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
