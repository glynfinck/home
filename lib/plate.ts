/**
 * Generated cover plates for projects that have no cover image.
 *
 * A plate is a small line drawing chosen by what the project is about (a graph
 * for a graph tool, an occupancy map for a robot that navigates) and drawn
 * from a seed, so a project always gets the same plate and two projects never
 * share one. Everything here is plain data: the component that renders it
 * (`components/site/project-cover.tsx`) is a server component emitting SVG, so
 * a plate costs no client JavaScript and follows the theme through CSS
 * variables.
 */

export const PLATE = { width: 320, height: 120 } as const;

export type PlateKind = "graph" | "map" | "line" | "wave" | "blocks" | "page";

export type PlateShape =
  | {
      type: "line";
      points: [number, number][];
      tone: Tone;
      width: number;
      dash?: string;
      opacity?: number;
    }
  | {
      type: "circle";
      cx: number;
      cy: number;
      r: number;
      fill: Tone | "surface" | "none";
      stroke?: Tone;
      opacity?: number;
    }
  | {
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      fill: Tone;
      opacity: number;
    };

type Tone = "brand" | "dim";

/** FNV-1a: a stable 32-bit hash of the seed string. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: a small deterministic PRNG, good enough for drawing. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Subject keywords, most specific first: a robot that follows tape is a line
 * follower before it is a robot. Matched as whole words against the title,
 * summary and stack, so "pipeline" is not a line and "macOS" is not an OS.
 */
const SUBJECTS: [PlateKind, RegExp][] = [
  ["line", /\b(tape|line[- ]follow\w*)\b/],
  ["map", /\b(slam|navigat\w*|lidar|maps?|mapping|autonomous)\b/],
  ["graph", /\b(graphs?|networks?|networkx|travers\w*|nodes?)\b/],
  [
    "wave",
    /\b(trading|quant\w*|signals?|markets?|backtest\w*|time[- ]series)\b/,
  ],
  [
    "blocks",
    /\b(ct scans?|3d|vr|voxels?|kernel|scheduler|embedded|firmware)\b/,
  ],
  ["page", /\b(blog|portfolio|website|site|cms|dashboard)\b/],
];
const FALLBACK: PlateKind[] = ["wave", "blocks", "graph", "page"];

/** Which plate a project gets. Deterministic for a given project. */
export function plateKind(project: {
  slug: string;
  title: string;
  summary: string;
  tech_stack: string[];
}): PlateKind {
  const text = [project.title, project.summary, ...project.tech_stack]
    .join(" ")
    .toLowerCase();
  for (const [kind, pattern] of SUBJECTS) {
    if (pattern.test(text)) return kind;
  }
  return FALLBACK[hash(project.slug) % FALLBACK.length];
}

const round = (n: number) => Math.round(n * 10) / 10;

/** The shapes of a plate, in a `PLATE.width` x `PLATE.height` box. */
export function plateShapes(kind: PlateKind, seed: string): PlateShape[] {
  const { width: w, height: h } = PLATE;
  const r = random(hash(seed));
  const shapes: PlateShape[] = [];

  if (kind === "graph") {
    const nodes: [number, number][] = Array.from({ length: 13 }, () => [
      round(24 + r() * (w - 48)),
      round(18 + r() * (h - 36)),
    ]);
    nodes.forEach((a, i) =>
      nodes.forEach((b, j) => {
        if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < w * 0.26) {
          shapes.push({
            type: "line",
            points: [a, b],
            tone: "dim",
            width: 1,
            opacity: 0.45,
          });
        }
      }),
    );
    nodes.forEach(([cx, cy], i) => {
      const visited = i < 4;
      shapes.push({
        type: "circle",
        cx,
        cy,
        r: visited ? 5 : 4,
        fill: visited ? "brand" : "surface",
        stroke: visited ? "brand" : "dim",
      });
    });
    return shapes;
  }

  if (kind === "map") {
    const cell = 12;
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (r() < 0.2) {
          shapes.push({
            type: "rect",
            x: x * cell + 1,
            y: y * cell + 1,
            w: cell - 2,
            h: cell - 2,
            fill: "dim",
            opacity: 0.28,
          });
        }
      }
    }
    let px = 2;
    let py = Math.floor(rows / 2);
    const centre = (): [number, number] => [
      px * cell + cell / 2,
      py * cell + cell / 2,
    ];
    const route: [number, number][] = [centre()];
    while (px < cols - 3) {
      if (r() < 0.62) px++;
      else py = Math.max(1, Math.min(rows - 2, py + (r() < 0.5 ? -1 : 1)));
      route.push(centre());
    }
    shapes.push({ type: "line", points: route, tone: "brand", width: 2 });
    const [cx, cy] = centre();
    shapes.push({ type: "circle", cx, cy, r: 4, fill: "brand" });
    return shapes;
  }

  if (kind === "line") {
    const phase = r() * 6;
    const freq = 0.02 + r() * 0.012;
    const tape: [number, number][] = [];
    for (let x = 0; x <= w; x += 6) {
      tape.push([
        x,
        round(
          h / 2 +
            Math.sin(phase + x * freq) * h * 0.26 +
            Math.sin(phase * 2 + x * freq * 2.7) * h * 0.08,
        ),
      ]);
    }
    shapes.push({
      type: "line",
      points: tape,
      tone: "dim",
      width: 7,
      opacity: 0.5,
    });
    shapes.push({
      type: "line",
      points: tape,
      tone: "brand",
      width: 1.5,
      dash: "3 5",
    });
    for (let k = 0; k < 3; k++) {
      const cx = round(w * (0.22 + k * 0.28));
      const cy = round(14 + r() * 10);
      shapes.push({
        type: "circle",
        cx,
        cy,
        r: 4,
        fill: "none",
        stroke: "brand",
      });
      shapes.push({
        type: "circle",
        cx,
        cy,
        r: 9,
        fill: "none",
        stroke: "brand",
        opacity: 0.35,
      });
    }
    return shapes;
  }

  if (kind === "wave") {
    // A mean-reverting path around a dashed long-run mean: the same process
    // the home page hero draws.
    shapes.push({
      type: "line",
      points: [
        [0, h / 2],
        [w, h / 2],
      ],
      tone: "dim",
      width: 1,
      dash: "4 5",
      opacity: 0.55,
    });
    const path: [number, number][] = [];
    let x = (r() - 0.5) * 0.6;
    for (let i = 0; i <= 80; i++) {
      const gauss =
        Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
      x += 0.12 * (0 - x) + 0.16 * gauss;
      path.push([
        round((i / 80) * w),
        round(h / 2 - Math.max(-1, Math.min(1, x)) * h * 0.38),
      ]);
    }
    shapes.push({ type: "line", points: path, tone: "brand", width: 1.6 });
    return shapes;
  }

  if (kind === "blocks") {
    // Stacked slices of uneven length, a few of them picked out.
    const rows = 6;
    const rowH = (h - 28) / rows;
    for (let y = 0; y < rows; y++) {
      let x = 16;
      while (x < w - 24) {
        const len = 14 + Math.floor(r() * 46);
        const end = Math.min(x + len, w - 16);
        const lit = r() < 0.16;
        shapes.push({
          type: "rect",
          x,
          y: round(14 + y * rowH),
          w: end - x,
          h: round(rowH - 5),
          fill: lit ? "brand" : "dim",
          opacity: lit ? 0.9 : 0.24,
        });
        x = end + 5;
      }
    }
    return shapes;
  }

  // page: a wireframe of a site, a column of text beside a rail.
  const rail = 16 + Math.floor(r() * 3) * 4;
  for (let i = 0; i < 4; i++) {
    shapes.push({
      type: "rect",
      x: 16,
      y: 18 + i * 12,
      w: rail + r() * 18,
      h: 4,
      fill: "dim",
      opacity: 0.3,
    });
  }
  const left = 88;
  shapes.push({
    type: "rect",
    x: left,
    y: 18,
    w: 96 + r() * 60,
    h: 9,
    fill: "brand",
    opacity: 0.9,
  });
  for (let i = 0; i < 6; i++) {
    const short = i === 5 || r() < 0.2;
    shapes.push({
      type: "rect",
      x: left,
      y: 40 + i * 11,
      w: short ? 70 + r() * 60 : w - left - 16 - r() * 24,
      h: 4,
      fill: "dim",
      opacity: 0.3,
    });
  }
  return shapes;
}
