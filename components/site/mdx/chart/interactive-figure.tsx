"use client";

import { useMemo, useState } from "react";

import { ChartFrame, DataTable } from "@/components/site/mdx/chart/chart-frame";
import { VegaView } from "@/components/site/mdx/chart/vega-view";
import {
  formatBps,
  formatPercent,
  formatUsd,
  netTotal,
  winRateAt,
} from "@/lib/chart";

/**
 * A figure whose parameter the reader controls.
 *
 * The redraw is Vega's: the control writes to the named signal on the live
 * view and the library re-evaluates the spec's transforms, so the curve at any
 * slider position is computed by the same code that drew it on the server, not
 * by a second implementation of the same arithmetic.
 *
 * What stays here is the chrome around the plot: the native range input the
 * site styles and the tests pin, the preset buttons, and the read-out. Those
 * numbers are recomputed with the formatters in `lib/chart.ts` so the prose
 * under the figure and the figure itself cannot disagree.
 */

export type ControlConfig = {
  param: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  presets?: { label: string; value: number }[];
  breakevenBps?: number;
  tableValues?: number[];
  description?: string;
};

export type InteractiveSeries = {
  gross: number[];
  turnover: number[];
};

export function InteractiveFigure({
  title,
  caption,
  source,
  description,
  control,
  svg,
  spec,
  data,
  series,
  winRate,
}: {
  title: string;
  caption?: string;
  source?: string;
  description: string;
  control: ControlConfig;
  svg: { narrow: string; wide: string };
  spec: { narrow: Record<string, unknown>; wide: Record<string, unknown> };
  data: Record<string, unknown[]>;
  series: InteractiveSeries;
  winRate?: { bps: number[]; rate: number[] };
}) {
  const [value, setValue] = useState(control.default);

  // A fresh object per change is what the view effect watches; memoised so an
  // unrelated re-render does not re-run it.
  const signals = useMemo(
    () => ({ [control.param]: value }),
    [control.param, value],
  );

  const total = netTotal(series, value);
  const rate = winRate ? winRateAt(winRate, value) : null;
  const underwater = total < 0;

  return (
    <ChartFrame
      title={title}
      caption={caption}
      source={source}
      readout={
        <dl
          // The numbers are the point of the control, so announce them as it moves.
          aria-live="polite"
          aria-atomic="true"
          className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pt-3 font-mono text-sm"
        >
          <div className="flex items-baseline gap-2">
            <dt className="text-xs text-muted-foreground">net</dt>
            <dd
              className={
                underwater
                  ? "text-base font-medium tabular-nums text-muted-foreground line-through decoration-1"
                  : "text-base font-medium tabular-nums text-foreground"
              }
            >
              {formatUsd(total)}
            </dd>
          </div>
          {rate !== null ? (
            <div className="flex items-baseline gap-2">
              <dt className="text-xs text-muted-foreground">win</dt>
              <dd className="tabular-nums text-foreground">
                {formatPercent(rate)}
              </dd>
            </div>
          ) : null}
          {control.breakevenBps !== undefined ? (
            <div className="flex items-baseline gap-2">
              <dt className="text-xs text-muted-foreground">break-even</dt>
              <dd className="tabular-nums text-foreground">
                {formatBps(control.breakevenBps)}
              </dd>
            </div>
          ) : null}
          {underwater ? (
            <p className="w-full text-xs text-muted-foreground">
              At {formatBps(value)} the edge is gone.
            </p>
          ) : null}
        </dl>
      }
      controls={<Control control={control} value={value} onChange={setValue} />}
      table={
        control.tableValues && winRate ? (
          <DataTable
            columns={["Fee", "Net PnL", "Win rate"]}
            rows={control.tableValues
              .filter((bps) => bps >= control.min && bps <= control.max)
              .map((bps) => [
                formatBps(bps),
                formatUsd(netTotal(series, bps)),
                formatPercent(winRateAt(winRate, bps)),
              ])}
          />
        ) : null
      }
    >
      <div
        role="img"
        aria-label={`${description} At ${formatBps(value)} per side it ends at ${formatUsd(total)}.`}
      >
        <VegaView
          className="sm:hidden"
          spec={spec.narrow}
          data={data}
          fallback={svg.narrow}
          signals={signals}
        />
        <VegaView
          className="hidden sm:block print:block"
          spec={spec.wide}
          data={data}
          fallback={svg.wide}
          signals={signals}
        />
      </div>
    </ChartFrame>
  );
}

function Control({
  control,
  value,
  onChange,
}: {
  control: ControlConfig;
  value: number;
  onChange: (next: number) => void;
}) {
  const presets = (control.presets ?? []).filter(
    (preset) => preset.value >= control.min && preset.value <= control.max,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <label
          htmlFor="chart-control"
          className="font-mono text-xs tracking-widest text-brand uppercase"
        >
          {control.label}
        </label>
        <output
          htmlFor="chart-control"
          className="font-mono text-sm tabular-nums text-foreground"
        >
          {formatBps(value)}
        </output>
      </div>

      {/* A native range input rather than Vega's `bind` widget: it is
          keyboard-operable without any work, and the site already styles its
          track and thumb. */}
      <input
        id="chart-control"
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="fee-slider w-full"
      />

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.value)}
            aria-pressed={Math.abs(preset.value - value) < control.step / 2}
            className="rounded-md border border-border/60 px-2 py-1 font-mono text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground aria-pressed:border-brand/60 aria-pressed:text-brand"
          >
            {preset.label} · {formatBps(preset.value)}
          </button>
        ))}
      </div>
    </div>
  );
}
