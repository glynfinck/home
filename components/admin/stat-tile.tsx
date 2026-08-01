import { ArrowUpRight } from "lucide-react";

import { Sparkline } from "@/components/admin/sparkline";
import { Card } from "@/components/ui/card";

/**
 * Headline number for the dashboard's top row.
 *
 * The trend chip is deliberately uncoloured: emerald and amber already mean
 * "papers" and "resume" across this page, so reusing emerald for "up" would
 * make the same hue mean two things. The arrow carries the direction.
 */
export function StatTile({
  label,
  value,
  hint,
  chip,
  trend,
  color,
}: {
  label: string;
  value: number;
  hint: string;
  chip?: string;
  trend?: number[];
  color?: string;
}) {
  return (
    <Card className="gap-3">
      <div className="px-(--card-spacing)">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
          {value.toLocaleString()}
        </p>
      </div>

      {trend && trend.length > 1 ? (
        <div className="px-(--card-spacing)">
          <Sparkline values={trend} color={color} />
        </div>
      ) : null}

      {/* `mt-auto` keeps the four footers on one line even though only the
          download tiles have a sparkline above them. */}
      <div className="mt-auto flex items-center justify-between gap-2 px-(--card-spacing) text-xs text-muted-foreground">
        <span>{hint}</span>
        {chip ? (
          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] ring-1 ring-border">
            {chip.startsWith("+") ? <ArrowUpRight className="size-3" /> : null}
            {chip.replace(/^\+/, "")}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
