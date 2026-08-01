import { cn } from "@/lib/utils";

/**
 * Trend strip for a stat tile.
 *
 * Drawn in a fixed 240x28 user space and stretched with
 * `preserveAspectRatio="none"`, so it fills whatever width the tile gives it
 * without measuring anything on the client. The stroke is pinned with
 * `vector-effect` so the stretch can't thicken it, and the emphasised endpoint
 * is a DOM element rather than a `<circle>` — a circle would smear into an
 * ellipse under the same stretch.
 */
export function Sparkline({
  values,
  className,
  color = "var(--series-1)",
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  if (values.length < 2) return <div className={cn("h-7", className)} />;

  const W = 240;
  const H = 28;
  const max = Math.max(1, ...values);
  const step = W / (values.length - 1);
  const y = (v: number) => H - 2 - (v / max) * (H - 6);

  const points = values.map((v, i) => [i * step, y(v)] as const);
  const line = points
    .map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`)
    .join(" ");

  const lastY = ((y(values[values.length - 1]) / H) * 100).toFixed(2);

  return (
    <div className={cn("relative h-7 w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        <path d={`${line} L${W},${H} L0,${H} Z`} fill={color} opacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="absolute size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
        style={{ right: 0, top: `${lastY}%`, background: color }}
      />
    </div>
  );
}
