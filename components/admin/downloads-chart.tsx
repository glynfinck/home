import type { DownloadDay } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

/**
 * Daily downloads, papers stacked under resume.
 *
 * Plain flex boxes rather than a measured SVG, so it stays a server component
 * and reflows with the column instead of needing a resize listener. Hover and
 * keyboard focus are CSS-only for the same reason.
 *
 * Emerald/amber sit in the 6-8 CVD band in light mode (see the note in
 * globals.css), which is legal only with secondary encoding — hence the
 * always-present legend and a tooltip that names both series in text. Don't
 * drop either one.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDay(iso: string) {
  const [, month, day] = iso.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}`;
}

export function DownloadsChart({ series }: { series: DownloadDay[] }) {
  const peak = Math.max(...series.map((d) => d.papers + d.resume), 0);
  // Round up to an even number so the three gridlines land on integers.
  const top = Math.max(2, Math.ceil(peak / 2) * 2);
  const ticks = [top, top / 2, 0];

  return (
    <div>
      <div className="flex items-center justify-end gap-4 pb-3">
        <Legend swatch="bg-series-1" label="Papers" />
        <Legend swatch="bg-series-2" label="Resume" />
      </div>

      {/* `pt-7` reserves the band the tooltips sit in, so the card's
          `overflow-hidden` can never clip one. */}
      <div className="flex gap-2 pt-7">
        {/* Same height as the plot so the labels line up with the gridlines. */}
        <div className="relative h-44 w-6 shrink-0">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 font-mono text-[10px] leading-none text-muted-foreground tabular-nums"
              style={{ top: `${(1 - tick / top) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-44">
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-border/60"
                style={{ top: `${(1 - tick / top) * 100}%` }}
              />
            ))}

            <div className="relative flex h-full items-end gap-px">
              {series.map((day, index) => {
                const total = day.papers + day.resume;
                // Keep the tooltip inside the plot at both ends.
                const align =
                  index < 3
                    ? "left-0"
                    : index > series.length - 4
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2";

                return (
                  <div
                    key={day.date}
                    tabIndex={0}
                    aria-label={`${formatDay(day.date)}: ${day.papers} paper, ${day.resume} resume`}
                    className="group relative flex h-full flex-1 cursor-default flex-col justify-end rounded-sm outline-none focus-visible:bg-accent/40"
                  >
                    {/* `h-full` is load-bearing: the bar heights below are
                        percentages, which resolve against this box. Without it
                        the box is content-sized and every bar collapses. */}
                    <div className="mx-auto flex h-full w-full max-w-3.5 flex-col justify-end">
                      {day.resume > 0 ? (
                        <div
                          className={cn(
                            "w-full rounded-t-[4px] bg-series-2 transition-[filter] group-hover:brightness-110",
                            day.papers > 0 && "mb-0.5",
                          )}
                          style={{
                            height: `max(2px, calc(${(day.resume / top) * 100}% - 2px))`,
                          }}
                        />
                      ) : null}
                      {day.papers > 0 ? (
                        <div
                          className={cn(
                            "w-full bg-series-1 transition-[filter] group-hover:brightness-110",
                            // Only the top of the stack is rounded; the foot
                            // stays square so bars read as sitting on the axis.
                            day.resume === 0 && "rounded-t-[4px]",
                          )}
                          style={{ height: `${(day.papers / top) * 100}%` }}
                        />
                      ) : null}
                      {total === 0 ? (
                        <div className="h-0.5 w-full rounded-full bg-border" />
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "pointer-events-none absolute top-0 z-10 w-max rounded-lg bg-popover px-2.5 py-2 opacity-0 shadow-lg ring-1 ring-foreground/10 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                        align,
                      )}
                      role="tooltip"
                    >
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {formatDay(day.date)}
                      </p>
                      <TooltipRow
                        swatch="bg-series-1"
                        label="Papers"
                        value={day.papers}
                      />
                      <TooltipRow
                        swatch="bg-series-2"
                        label="Resume"
                        value={day.resume}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sparse axis — first, middle and last, never one label per bar. */}
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>{formatDay(series[0].date)}</span>
            <span>{formatDay(series[Math.floor(series.length / 2)].date)}</span>
            <span>{formatDay(series[series.length - 1].date)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-2.5 rounded-[2px]", swatch)} />
      {label}
    </span>
  );
}

function TooltipRow({
  swatch,
  label,
  value,
}: {
  swatch: string;
  label: string;
  value: number;
}) {
  return (
    <span className="mt-1 flex items-center justify-between gap-6 text-xs">
      <span className="flex items-center gap-1.5">
        <span className={cn("size-2 rounded-[2px]", swatch)} />
        {label}
      </span>
      <span className="font-mono tabular-nums">{value}</span>
    </span>
  );
}
