import { BarChart } from "@/components/site/mdx/chart/bar-chart";
import { ChartError } from "@/components/site/mdx/chart/chart-frame";
import { EquityChart } from "@/components/site/mdx/chart/equity-chart";
import { LineChart } from "@/components/site/mdx/chart/line-chart";
import { loadFigure } from "@/lib/figure";
import type { BarFigure, EquityFigure, LinesFigure } from "@/lib/chart";

/**
 * `<Chart src="/figures/pairs-equity.json" />`
 *
 * Server component: it resolves and validates the payload during the render,
 * so the client receives data rather than a URL and never shows a loading
 * state. The `kind` field in the payload picks the renderer, which keeps MDX
 * authoring to a single tag.
 *
 * `src` may be a path under `public/` or an absolute URL (e.g. a JSON uploaded
 * to the Supabase `media` bucket through `/admin/media`).
 *
 * `title` and `caption` override whatever the payload carries. The payload's
 * text describes the *data*; a caption is part of the article's argument, so
 * it belongs in the MDX where it stays visible and editable in `/admin` rather
 * than buried in a generated JSON file.
 */
export async function Chart({
  src,
  title,
  caption,
}: {
  src: string;
  title?: string;
  caption?: string;
}) {
  const figure = await loadFigure(src);
  if (!figure) return <ChartError src={src} />;

  const withOverrides = {
    ...figure,
    ...(title ? { title } : {}),
    ...(caption ? { caption } : {}),
  };

  switch (figure.kind) {
    case "equity":
      return <EquityChart figure={withOverrides as EquityFigure} />;
    case "bar":
      return <BarChart figure={withOverrides as BarFigure} />;
    case "lines":
      return <LineChart figure={withOverrides as LinesFigure} />;
    default:
      return <ChartError src={src} />;
  }
}
