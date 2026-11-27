/**
 * Generated cover plates for projects that have no cover image.
 *
 * A plate is a small line drawing of what the project actually does: a weekly
 * chore board for a chore app, a breadth-first search for a graph tool, an
 * occupancy map with a planned route for a robot that navigates. It is drawn
 * from a seed, so a project always gets the same plate and two projects of the
 * same kind still differ. Everything here is plain data: the component that
 * renders it (`components/site/project-cover.tsx`) is a server component
 * emitting SVG, so a plate costs no client JavaScript and follows the theme
 * through CSS variables.
 *
 * Every drawing keeps a margin of at least 10 units inside the
 * `PLATE.width` x `PLATE.height` box, so nothing touches the card's edges.
 */

export const PLATE = { width: 320, height: 120 } as const;

export type PlateKind =
  | "rota"
  | "scorecard"
  | "scan"
  | "line"
  | "map"
  | "graph"
  | "wave"
  | "blocks"
  | "page";

export const PLATE_KINDS: readonly PlateKind[] = [
  "rota",
  "scorecard",
  "scan",
  "line",
  "map",
  "graph",
  "wave",
  "blocks",
  "page",
];

/** `brand` is the accent, `dim` the muted ink, `fg` full-strength ink. */
export type Tone = "brand" | "dim" | "fg";
type Fill = Tone | "surface" | "none";

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
      type: "path";
      d: string;
      fill: Fill;
      stroke?: Tone;
      width?: number;
      dash?: string;
      opacity?: number;
    }
  | {
      type: "circle";
      cx: number;
      cy: number;
      r: number;
      fill: Fill;
      stroke?: Tone;
      width?: number;
      opacity?: number;
    }
  | {
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      fill: Fill;
      stroke?: Tone;
      width?: number;
      radius?: number;
      opacity?: number;
    }
  | {
      type: "text";
      x: number;
      y: number;
      text: string;
      tone: Tone;
      size: number;
      anchor?: "start" | "middle" | "end";
      opacity?: number;
    };

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
 * follower before it is a robot, and a surgical tool built in VR is about
 * bones before it is about 3D. Matched as whole words against the title,
 * summary and stack, so "pipeline" is not a line and "macOS" is not an OS.
 */
const SUBJECTS: [PlateKind, RegExp][] = [
  ["line", /\b(tape|line[- ]follow\w*)\b/],
  ["scan", /\b(ct|mri|x-?rays?|scans?|surg\w*|medical|bones?|fractur\w*)\b/],
  ["rota", /\b(chores?|housework|housemates?|rotas?|household|flatmates?)\b/],
  ["scorecard", /\b(golf|scorecards?|leaderboards?|tournaments?)\b/],
  ["map", /\b(slam|navigat\w*|lidar|maps?|mapping|autonomous)\b/],
  ["graph", /\b(graphs?|networks?|networkx|travers\w*|nodes?)\b/],
  [
    "wave",
    /\b(trading|quant\w*|signals?|markets?|backtest\w*|time[- ]series)\b/,
  ],
  ["blocks", /\b(3d|vr|voxels?|kernel|scheduler|embedded|firmware)\b/],
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
const pt = (x: number, y: number): [number, number] => [round(x), round(y)];
type Rand = () => number;

/** The shapes of a plate, in a `PLATE.width` x `PLATE.height` box. */
export function plateShapes(kind: PlateKind, seed: string): PlateShape[] {
  const r = random(hash(seed));
  return DRAW[kind](r);
}

const DRAW: Record<PlateKind, (r: Rand) => PlateShape[]> = {
  rota,
  scorecard,
  scan,
  line,
  map,
  graph,
  wave,
  blocks,
  page,
};

/**
 * A week of chores dealt out between housemates: who has what each day, what
 * is already ticked off, and a fair-share bar per person that comes out about
 * even.
 */
function rota(r: Rand): PlateShape[] {
  const shapes: PlateShape[] = [];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const x0 = 62;
  const step = 27;
  const rows = [46, 68, 90];
  const today = 3 + Math.floor(r() * 3);

  // Today's column, lightly picked out.
  shapes.push({
    type: "rect",
    x: x0 + today * step - 13,
    y: 14,
    w: 26,
    h: 92,
    fill: "brand",
    opacity: 0.08,
    radius: 4,
  });
  days.forEach((day, i) =>
    shapes.push({
      type: "text",
      x: x0 + i * step,
      y: 26,
      text: day,
      tone: i === today ? "brand" : "dim",
      size: 9,
      anchor: "middle",
      opacity: i === today ? 1 : 0.8,
    }),
  );

  rows.forEach((y, row) => {
    // Housemates: one person is the reader, picked out in the brand.
    shapes.push({
      type: "circle",
      cx: 30,
      cy: y,
      r: 7,
      fill: row === 0 ? "brand" : "surface",
      stroke: row === 0 ? "brand" : "dim",
      opacity: row === 0 ? 0.9 : 0.7,
    });
    days.forEach((_, i) => {
      if (r() > 0.58) return;
      const cx = x0 + i * step;
      const done = i < today || (i === today && r() < 0.5);
      shapes.push({
        type: "rect",
        x: cx - 10,
        y: y - 6,
        w: 20,
        h: 12,
        radius: 3,
        fill: done ? "brand" : "surface",
        stroke: done ? "brand" : "dim",
        width: 1.2,
        opacity: done ? 0.85 : 0.6,
      });
      if (done) {
        shapes.push({
          type: "path",
          d: `M${cx - 4} ${y} l3 3 l5.5 -6`,
          fill: "none",
          stroke: "fg",
          width: 1.4,
          opacity: 0.75,
        });
      }
    });
  });

  // Fair shares: each person's bar ends close to the same dashed line.
  const left = 262;
  const target = 296;
  shapes.push({
    type: "line",
    points: [
      [target, 34],
      [target, 100],
    ],
    tone: "dim",
    width: 1,
    dash: "2 3",
    opacity: 0.6,
  });
  rows.forEach((y, row) => {
    const len = target - left + (r() - 0.5) * 10;
    shapes.push({
      type: "rect",
      x: left,
      y: y - 3,
      w: round(len),
      h: 6,
      radius: 3,
      fill: row === 0 ? "brand" : "dim",
      opacity: row === 0 ? 0.85 : 0.4,
    });
  });
  return shapes;
}

/**
 * A shared scorecard over nine holes, filled in up to the hole being played,
 * beside the round's hole timer.
 */
function scorecard(r: Rand): PlateShape[] {
  const shapes: PlateShape[] = [];
  const x0 = 58;
  const step = 21;
  const rows = [50, 70, 90];
  const hole = 4 + Math.floor(r() * 3);

  shapes.push({
    type: "rect",
    x: 14,
    y: 14,
    w: 222,
    h: 92,
    radius: 6,
    fill: "none",
    stroke: "dim",
    width: 1,
    opacity: 0.45,
  });
  shapes.push({
    type: "rect",
    x: x0 + hole * step - 10,
    y: 18,
    w: 20,
    h: 84,
    radius: 3,
    fill: "brand",
    opacity: 0.1,
  });
  for (let i = 0; i < 9; i++) {
    shapes.push({
      type: "text",
      x: x0 + i * step,
      y: 32,
      text: String(i + 1),
      tone: i === hole ? "brand" : "dim",
      size: 9,
      anchor: "middle",
    });
  }
  shapes.push({
    type: "line",
    points: [
      [20, 38],
      [230, 38],
    ],
    tone: "dim",
    width: 1,
    opacity: 0.35,
  });
  rows.forEach((y, row) => {
    shapes.push({
      type: "circle",
      cx: 30,
      cy: y - 3,
      r: 5,
      fill: row === 0 ? "brand" : "surface",
      stroke: row === 0 ? "brand" : "dim",
      opacity: row === 0 ? 0.9 : 0.7,
    });
    for (let i = 0; i < 9; i++) {
      const x = x0 + i * step;
      if (i < hole) {
        shapes.push({
          type: "text",
          x,
          y,
          text: String(2 + Math.floor(r() * 4)),
          tone: "fg",
          size: 9,
          anchor: "middle",
          opacity: 0.75,
        });
      } else {
        shapes.push({
          type: "line",
          points: [
            [x - 3, y - 3],
            [x + 3, y - 3],
          ],
          tone: "dim",
          width: 1,
          opacity: 0.5,
        });
      }
    }
  });

  // The hole timer: a ring that empties as the hole runs down.
  const cx = 282;
  const cy = 60;
  const rad = 24;
  const left = 0.25 + r() * 0.6;
  const end = -Math.PI / 2 + left * 2 * Math.PI;
  shapes.push({
    type: "circle",
    cx,
    cy,
    r: rad,
    fill: "none",
    stroke: "dim",
    width: 4,
    opacity: 0.25,
  });
  shapes.push({
    type: "path",
    d: `M${cx} ${cy - rad} A${rad} ${rad} 0 ${left > 0.5 ? 1 : 0} 1 ${round(cx + rad * Math.cos(end))} ${round(cy + rad * Math.sin(end))}`,
    fill: "none",
    stroke: "brand",
    width: 4,
  });
  const secs = Math.round(left * 300);
  shapes.push({
    type: "text",
    x: cx,
    y: cy + 3.5,
    text: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`,
    tone: "fg",
    size: 10,
    anchor: "middle",
    opacity: 0.8,
  });
  return shapes;
}

/**
 * A long bone from a CT scan, broken into labelled fragments, inside a
 * viewer's crop marks with the scan's slice planes behind it.
 */
function scan(r: Rand): PlateShape[] {
  const shapes: PlateShape[] = [];
  const mid = 60;
  const a = 64;
  const b = 256;

  // Half-width of the bone along its length: a shaft that swells into a
  // rounded head at each end.
  const g = (d: number) => Math.exp(-((d / 15) ** 2));
  const hw = (x: number) => {
    const t = (x - (a + b) / 2) / ((b - a) / 2);
    const cap = Math.sqrt(Math.max(0, 1 - t ** 8));
    return (7 + 11 * g(x - a - 12) + 9 * g(x - b + 12)) * cap;
  };

  // Slice planes, one of them the slice on screen.
  const current = 4 + Math.floor(r() * 7);
  for (let i = 0; i < 15; i++) {
    const x = 48 + i * 16;
    shapes.push({
      type: "line",
      points: [
        [x, 20],
        [x, 100],
      ],
      tone: i === current ? "brand" : "dim",
      width: 1,
      dash: i === current ? undefined : "2 4",
      opacity: i === current ? 0.6 : 0.3,
    });
  }

  // Two fractures, each a zigzag across the shaft.
  const fractures = [126 + r() * 18, 178 + r() * 18].map((xf) => {
    const zig = [0, 1, 2, 3, 4].map((k) => (k % 2 ? 1 : -1) * (2 + r() * 3));
    return (side: number) =>
      zig.map((dx, k): [number, number] => {
        const h = hw(xf);
        return [xf + dx + side, mid - h + (k / 4) * 2 * h];
      });
  });

  const edge = (from: number, to: number, sign: number, dy: number) => {
    const pts: [number, number][] = [];
    const n = Math.max(2, Math.ceil(Math.abs(to - from) / 3));
    for (let k = 0; k <= n; k++) {
      const x = from + ((to - from) * k) / n;
      pts.push(pt(x, mid + sign * hw(x) + dy));
    }
    return pts;
  };
  const toD = (pts: [number, number][]) =>
    "M" + pts.map(([x, y]) => `${round(x)} ${round(y)}`).join(" L") + " Z";

  const lift = [0, -4, 0];
  const pieces: [number, number][][] = [];
  // Left fragment: from the bone's end to the first fracture.
  {
    const f = fractures[0](-2);
    pieces.push([
      ...edge(a, f[0][0], -1, lift[0]),
      ...f.map(([x, y]): [number, number] => [x, y + lift[0]]),
      ...edge(f[4][0], a, 1, lift[0]),
    ]);
  }
  // Middle fragment, knocked out of line.
  {
    const f0 = fractures[0](2);
    const f1 = fractures[1](-2);
    pieces.push([
      ...edge(f0[0][0], f1[0][0], -1, lift[1]).map(
        ([x, y]): [number, number] => [x + 3, y],
      ),
      ...f1.map(([x, y]): [number, number] => [x + 3, y + lift[1]]),
      ...edge(f1[4][0], f0[4][0], 1, lift[1]).map(
        ([x, y]): [number, number] => [x + 3, y],
      ),
      ...[...f0]
        .reverse()
        .map(([x, y]): [number, number] => [x + 3, y + lift[1]]),
    ]);
  }
  // Right fragment.
  {
    const f = fractures[1](2);
    pieces.push([
      ...edge(f[0][0], b, -1, lift[2]).map(([x, y]): [number, number] => [
        x + 6,
        y,
      ]),
      ...edge(b, f[4][0], 1, lift[2]).map(([x, y]): [number, number] => [
        x + 6,
        y,
      ]),
      ...[...f].reverse().map(([x, y]): [number, number] => [x + 6, y]),
    ]);
  }
  pieces.forEach((piece, i) => {
    shapes.push({
      type: "path",
      d: toD(piece),
      fill: i === 1 ? "brand" : "surface",
      stroke: i === 1 ? "brand" : "dim",
      width: 1.4,
      opacity: i === 1 ? 0.35 : 0.9,
    });
    if (i === 1) {
      shapes.push({
        type: "path",
        d: toD(piece),
        fill: "none",
        stroke: "brand",
        width: 1.4,
      });
    }
  });

  // Fragment labels, as the classifier would tag them.
  const centres = [
    (a + fractures[0](0)[0][0]) / 2,
    (fractures[0](0)[0][0] + fractures[1](0)[0][0]) / 2 + 3,
    (fractures[1](0)[0][0] + b) / 2 + 6,
  ];
  ["A", "B", "C"].forEach((label, i) =>
    shapes.push({
      type: "text",
      x: round(centres[i]),
      y: i === 1 ? 102 : 104,
      text: label,
      tone: i === 1 ? "brand" : "dim",
      size: 9,
      anchor: "middle",
    }),
  );

  // Viewer crop marks.
  const box = { x: 16, y: 12, w: 288, h: 96, l: 10 };
  for (const [x, y, sx, sy] of [
    [box.x, box.y, 1, 1],
    [box.x + box.w, box.y, -1, 1],
    [box.x, box.y + box.h, 1, -1],
    [box.x + box.w, box.y + box.h, -1, -1],
  ]) {
    shapes.push({
      type: "line",
      points: [
        [x + sx * box.l, y],
        [x, y],
        [x, y + sy * box.l],
      ],
      tone: "dim",
      width: 1.4,
      opacity: 0.7,
    });
  }
  return shapes;
}

/**
 * A competition course: a robot following a strip of tape, an infrared beacon
 * pulsing at it, and the zipline home with an agent hanging from it.
 */
function line(r: Rand): PlateShape[] {
  const shapes: PlateShape[] = [];
  const phase = r() * Math.PI * 2;
  const tape: [number, number][] = [];
  for (let x = 18; x <= 226; x += 4) {
    const t = (x - 18) / 208;
    tape.push(pt(x, 62 + Math.sin(phase + t * Math.PI * 2.4) * 34));
  }
  shapes.push({
    type: "line",
    points: tape,
    tone: "dim",
    width: 10,
    opacity: 0.28,
  });
  shapes.push({
    type: "line",
    points: tape,
    tone: "dim",
    width: 1,
    dash: "4 4",
    opacity: 0.8,
  });

  // The robot, part way along the tape, with the path it has covered.
  const at = Math.floor(tape.length * (0.38 + r() * 0.2));
  shapes.push({
    type: "line",
    points: tape.slice(0, at + 1),
    tone: "brand",
    width: 2,
  });
  const [rx, ry] = tape[at];
  shapes.push({
    type: "circle",
    cx: rx,
    cy: ry,
    r: 9,
    fill: "surface",
    stroke: "brand",
    width: 1.8,
  });
  shapes.push({ type: "circle", cx: rx, cy: ry, r: 3, fill: "brand" });

  // Infrared beacon, top right, pulsing towards the course.
  const bx = 248;
  const by = 30;
  shapes.push({
    type: "rect",
    x: bx - 4,
    y: by - 4,
    w: 8,
    h: 8,
    radius: 1.5,
    fill: "brand",
  });
  [12, 20, 28].forEach((rad, i) =>
    shapes.push({
      type: "path",
      d: `M${round(bx - rad * Math.cos(0.6))} ${round(by - rad * Math.sin(0.6))} A${rad} ${rad} 0 0 0 ${round(bx - rad * Math.cos(0.6))} ${round(by + rad * Math.sin(0.6))}`,
      fill: "none",
      stroke: "brand",
      width: 1.4,
      opacity: 0.75 - i * 0.22,
    }),
  );

  // Zipline from the tower down to home, with an agent on it.
  const z0: [number, number] = [262, 16];
  const z1: [number, number] = [306, 102];
  shapes.push({
    type: "line",
    points: [z0, z1],
    tone: "dim",
    width: 1.2,
    opacity: 0.8,
  });
  shapes.push({
    type: "rect",
    x: z1[0] - 12,
    y: z1[1] - 4,
    w: 14,
    h: 6,
    radius: 1.5,
    fill: "dim",
    opacity: 0.45,
  });
  const s = 0.45 + r() * 0.2;
  const hx = round(z0[0] + (z1[0] - z0[0]) * s);
  const hy = round(z0[1] + (z1[1] - z0[1]) * s);
  shapes.push({
    type: "line",
    points: [
      [hx, hy],
      [hx, hy + 10],
    ],
    tone: "fg",
    width: 1,
    opacity: 0.6,
  });
  shapes.push({
    type: "circle",
    cx: hx,
    cy: hy + 14,
    r: 4,
    fill: "fg",
    opacity: 0.7,
  });
  return shapes;
}

/**
 * An occupancy grid of an office, as SLAM would build it: walls with
 * doorways, furniture, the robot sweeping its lidar, and the route it has
 * planned around everything to the next bottle it has detected.
 */
function map(r: Rand): PlateShape[] {
  const shapes: PlateShape[] = [];
  const cell = 8;
  const cols = 36;
  const rows = 12;
  const ox = (320 - cols * cell) / 2;
  const oy = (120 - rows * cell) / 2;
  const wall: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false),
  );
  const set = (x: number, y: number) => {
    if (y >= 0 && y < rows && x >= 0 && x < cols) wall[y][x] = true;
  };

  for (let x = 0; x < cols; x++) {
    set(x, 0);
    set(x, rows - 1);
  }
  for (let y = 0; y < rows; y++) {
    set(0, y);
    set(cols - 1, y);
  }
  // Two partition walls, each with a doorway.
  for (const col of [11 + Math.floor(r() * 3), 22 + Math.floor(r() * 3)]) {
    const door = 2 + Math.floor(r() * (rows - 6));
    for (let y = 1; y < rows - 1; y++) {
      if (y < door || y > door + 2) set(col, y);
    }
  }
  // Desks: a few small blocks out in the rooms.
  for (let k = 0; k < 4; k++) {
    const x = 4 + Math.floor(r() * (cols - 9));
    const y = 2 + Math.floor(r() * (rows - 5));
    if (x <= 5 || x >= cols - 6) continue;
    set(x, y);
    set(x + 1, y);
    if (r() < 0.5) set(x, y + 1);
  }

  const free = (x: number, y: number) =>
    y > 0 && y < rows - 1 && x > 0 && x < cols - 1 && !wall[y][x];
  const nearestFree = (x: number, y: number): [number, number] => {
    for (let d = 0; d < cols; d++) {
      for (const [dx, dy] of [
        [0, d],
        [0, -d],
        [d, 0],
        [-d, 0],
      ]) {
        if (free(x + dx, y + dy)) return [x + dx, y + dy];
      }
    }
    return [1, 1];
  };
  const start = nearestFree(4, 3 + Math.floor(r() * (rows - 6)));
  const goal = nearestFree(cols - 5, 2 + Math.floor(r() * (rows - 5)));

  wall.forEach((row, y) =>
    row.forEach((on, x) => {
      if (!on) return;
      shapes.push({
        type: "rect",
        x: ox + x * cell + 0.75,
        y: oy + y * cell + 0.75,
        w: cell - 1.5,
        h: cell - 1.5,
        radius: 1,
        fill: "dim",
        opacity: 0.4,
      });
    }),
  );

  // Lidar: rays from the robot to the first wall they hit.
  const [sx, sy] = [
    ox + start[0] * cell + cell / 2,
    oy + start[1] * cell + cell / 2,
  ];
  for (let k = 0; k < 18; k++) {
    const ang = (k / 18) * Math.PI * 2 + 0.1;
    let d = 4;
    while (d < 90) {
      const px = sx + Math.cos(ang) * d;
      const py = sy + Math.sin(ang) * d;
      const gx = Math.floor((px - ox) / cell);
      const gy = Math.floor((py - oy) / cell);
      if (gy < 0 || gy >= rows || gx < 0 || gx >= cols || wall[gy][gx]) break;
      d += 1;
    }
    const end = pt(sx + Math.cos(ang) * d, sy + Math.sin(ang) * d);
    shapes.push({
      type: "line",
      points: [pt(sx, sy), end],
      tone: "brand",
      width: 0.8,
      opacity: 0.25,
    });
    shapes.push({
      type: "circle",
      cx: end[0],
      cy: end[1],
      r: 1.2,
      fill: "brand",
      opacity: 0.7,
    });
  }

  // Breadth-first route through the doorways.
  const key = (x: number, y: number) => y * cols + x;
  const prev = new Map<number, number>([[key(...start), -1]]);
  const queue: [number, number][] = [start];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    if (x === goal[0] && y === goal[1]) break;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [0, -1],
      [-1, 0],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (free(nx, ny) && !prev.has(key(nx, ny))) {
        prev.set(key(nx, ny), key(x, y));
        queue.push([nx, ny]);
      }
    }
  }
  const route: [number, number][] = [];
  if (prev.has(key(...goal))) {
    for (let k = key(...goal); k !== -1; k = prev.get(k)!) {
      route.unshift([
        ox + (k % cols) * cell + cell / 2,
        oy + Math.floor(k / cols) * cell + cell / 2,
      ]);
    }
    // Keep only the corners, so the route reads as a path, not a staircase.
    const corners = route.filter((p, i) => {
      if (i === 0 || i === route.length - 1) return true;
      const [a, b] = [route[i - 1], route[i + 1]];
      return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
    });
    shapes.push({
      type: "line",
      points: corners,
      tone: "brand",
      width: 1.8,
      dash: "5 3",
    });
  }

  // The bottle it is heading for, in a detection box.
  const [gx, gy] = [
    ox + goal[0] * cell + cell / 2,
    oy + goal[1] * cell + cell / 2,
  ];
  shapes.push({
    type: "rect",
    x: gx - 7,
    y: gy - 9,
    w: 14,
    h: 18,
    radius: 2,
    fill: "none",
    stroke: "brand",
    width: 1.2,
  });
  shapes.push({
    type: "rect",
    x: gx - 2.5,
    y: gy - 5,
    w: 5,
    h: 10,
    radius: 2,
    fill: "brand",
  });

  // The robot itself.
  shapes.push({
    type: "circle",
    cx: sx,
    cy: sy,
    r: 6,
    fill: "surface",
    stroke: "brand",
    width: 1.8,
  });
  shapes.push({ type: "circle", cx: sx, cy: sy, r: 2.2, fill: "brand" });
  return shapes;
}

/**
 * A graph mid-traversal: nodes laid out so none overlap, the breadth-first
 * tree so far in the brand, the frontier ringed, and the player's scrub bar
 * underneath.
 */
function graph(r: Rand): PlateShape[] {
  const shapes: PlateShape[] = [];
  const cols = 7;
  const rows = 3;
  const xs = (c: number) => 34 + c * 42;
  const ys = (rw: number) => 22 + rw * 30;

  type Node = { id: number; x: number; y: number; c: number; rw: number };
  const nodes: Node[] = [];
  for (let rw = 0; rw < rows; rw++) {
    for (let c = 0; c < cols; c++) {
      if (r() < 0.14 && c !== 0) continue;
      nodes.push({
        id: nodes.length,
        x: round(xs(c) + (r() - 0.5) * 16),
        y: round(ys(rw) + (r() - 0.5) * 10),
        c,
        rw,
      });
    }
  }
  const at = (c: number, rw: number) =>
    nodes.find((n) => n.c === c && n.rw === rw);
  // The next node along the row, stepping over a gap.
  const next = (n: Node) =>
    nodes.find((m) => m.rw === n.rw && m.c === n.c + 1) ??
    nodes.find((m) => m.rw === n.rw && m.c === n.c + 2);
  const edges: [Node, Node][] = [];
  for (const n of nodes) {
    const right = next(n);
    const down = at(n.c, n.rw + 1);
    const diag = at(n.c + 1, n.rw + (r() < 0.5 ? 1 : -1));
    if (right && r() < 0.85) edges.push([n, right]);
    // Every other column is tied to the row below, so the rows stay joined.
    if (down && (n.c % 2 === 0 || r() < 0.4)) edges.push([n, down]);
    if (diag && r() < 0.25) edges.push([n, diag]);
  }

  const adj = new Map<number, Node[]>(nodes.map((n) => [n.id, []]));
  for (const [p, q] of edges) {
    adj.get(p.id)!.push(q);
    adj.get(q.id)!.push(p);
  }
  // Breadth-first from the left-middle node.
  const source = at(0, 1) ?? nodes[0];
  const order: Node[] = [source];
  const parent = new Map<number, Node | null>([[source.id, null]]);
  for (let i = 0; i < order.length; i++) {
    for (const m of adj.get(order[i].id)!) {
      if (!parent.has(m.id)) {
        parent.set(m.id, order[i]);
        order.push(m);
      }
    }
  }
  const reached = new Set(order.map((n) => n.id));
  const progress = 0.45 + r() * 0.2;
  const visitedCount = Math.max(3, Math.round(order.length * progress));
  const visited = new Set(order.slice(0, visitedCount).map((n) => n.id));
  const frontier = new Set(
    order.slice(visitedCount, visitedCount + 3).map((n) => n.id),
  );

  for (const [p, q] of edges) {
    if (!reached.has(p.id) || !reached.has(q.id)) continue;
    const tree =
      (parent.get(q.id) === p || parent.get(p.id) === q) &&
      visited.has(p.id) &&
      visited.has(q.id);
    shapes.push({
      type: "line",
      points: [
        [p.x, p.y],
        [q.x, q.y],
      ],
      tone: tree ? "brand" : "dim",
      width: tree ? 2 : 1,
      opacity: tree ? 0.9 : 0.4,
    });
  }
  const current = order[visitedCount - 1];
  for (const n of nodes) {
    if (!reached.has(n.id)) continue;
    if (n === current) {
      shapes.push({
        type: "circle",
        cx: n.x,
        cy: n.y,
        r: 10,
        fill: "brand",
        opacity: 0.18,
      });
    }
    const v = visited.has(n.id);
    const f = frontier.has(n.id);
    shapes.push({
      type: "circle",
      cx: n.x,
      cy: n.y,
      r: v ? 5 : 4.5,
      fill: v ? "brand" : "surface",
      stroke: v || f ? "brand" : "dim",
      width: f ? 1.8 : 1.4,
      opacity: v || f ? 1 : 0.8,
    });
  }

  // Player: play button and a scrub bar at the traversal's progress.
  const y = 104;
  shapes.push({
    type: "path",
    d: `M20 ${y - 5} L28 ${y} L20 ${y + 5} Z`,
    fill: "fg",
    opacity: 0.7,
  });
  const x0 = 38;
  const x1 = 300;
  const xp = round(x0 + (x1 - x0) * (visitedCount / order.length));
  shapes.push({
    type: "line",
    points: [
      [x0, y],
      [x1, y],
    ],
    tone: "dim",
    width: 2,
    opacity: 0.3,
  });
  shapes.push({
    type: "line",
    points: [
      [x0, y],
      [xp, y],
    ],
    tone: "brand",
    width: 2,
  });
  shapes.push({
    type: "circle",
    cx: xp,
    cy: y,
    r: 4,
    fill: "surface",
    stroke: "brand",
    width: 1.8,
  });
  return shapes;
}

/**
 * A mean-reverting path around a dashed long-run mean, inside its one-sigma
 * band: the same process the home page hero draws.
 */
function wave(r: Rand): PlateShape[] {
  const shapes: PlateShape[] = [];
  const mid = 60;
  const amp = 40;
  shapes.push({
    type: "rect",
    x: 14,
    y: mid - amp * 0.5,
    w: 292,
    h: amp,
    fill: "brand",
    opacity: 0.07,
  });
  for (const y of [mid - amp * 0.5, mid + amp * 0.5]) {
    shapes.push({
      type: "line",
      points: [
        [14, y],
        [306, y],
      ],
      tone: "dim",
      width: 1,
      dash: "2 4",
      opacity: 0.4,
    });
  }
  shapes.push({
    type: "line",
    points: [
      [14, mid],
      [306, mid],
    ],
    tone: "dim",
    width: 1,
    dash: "4 5",
    opacity: 0.6,
  });
  const path: [number, number][] = [];
  let x = (r() - 0.5) * 0.6;
  for (let i = 0; i <= 80; i++) {
    const gauss =
      Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    x += 0.12 * (0 - x) + 0.16 * gauss;
    path.push(
      pt(14 + (i / 80) * 292, mid - Math.max(-1, Math.min(1, x)) * amp),
    );
  }
  shapes.push({ type: "line", points: path, tone: "brand", width: 1.6 });
  const [ex, ey] = path[path.length - 1];
  shapes.push({ type: "circle", cx: ex, cy: ey, r: 3, fill: "brand" });
  return shapes;
}

/** Stacked slices of uneven length, a few of them picked out. */
function blocks(r: Rand): PlateShape[] {
  const shapes: PlateShape[] = [];
  const rows = 6;
  const rowH = 92 / rows;
  for (let y = 0; y < rows; y++) {
    let x = 16;
    while (x < 304 - 10) {
      const len = 14 + Math.floor(r() * 46);
      const end = Math.min(x + len, 304);
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

/**
 * A browser window on a page of the site: a nav rail, a headline, a column of
 * text, and a chart panel beside it.
 */
function page(r: Rand): PlateShape[] {
  const shapes: PlateShape[] = [];
  const win = { x: 18, y: 10, w: 284, h: 104 };
  shapes.push({
    type: "rect",
    x: win.x,
    y: win.y,
    w: win.w,
    h: win.h,
    radius: 6,
    fill: "surface",
    stroke: "dim",
    width: 1,
    opacity: 0.6,
  });
  shapes.push({
    type: "line",
    points: [
      [win.x, win.y + 16],
      [win.x + win.w, win.y + 16],
    ],
    tone: "dim",
    width: 1,
    opacity: 0.35,
  });
  [0, 1, 2].forEach((i) =>
    shapes.push({
      type: "circle",
      cx: win.x + 10 + i * 8,
      cy: win.y + 8,
      r: 2.2,
      fill: "dim",
      opacity: 0.5,
    }),
  );
  shapes.push({
    type: "rect",
    x: win.x + 46,
    y: win.y + 4,
    w: 120,
    h: 8,
    radius: 4,
    fill: "dim",
    opacity: 0.15,
  });

  // Nav rail.
  for (let i = 0; i < 4; i++) {
    shapes.push({
      type: "rect",
      x: win.x + 12,
      y: win.y + 30 + i * 11,
      w: round(22 + r() * 14),
      h: 4,
      fill: i === 0 ? "brand" : "dim",
      opacity: i === 0 ? 0.8 : 0.3,
    });
  }

  // Headline and body text.
  const left = win.x + 64;
  shapes.push({
    type: "rect",
    x: left,
    y: win.y + 28,
    w: round(70 + r() * 30),
    h: 8,
    fill: "fg",
    opacity: 0.75,
  });
  for (let i = 0; i < 5; i++) {
    const last = i === 4;
    shapes.push({
      type: "rect",
      x: left,
      y: win.y + 46 + i * 10,
      w: round(last ? 40 + r() * 30 : 96 + r() * 22),
      h: 4,
      fill: "dim",
      opacity: 0.3,
    });
  }

  // Chart panel with a little mean-reverting series in it.
  const panel = { x: win.x + 190, y: win.y + 28, w: 82, h: 64 };
  shapes.push({
    type: "rect",
    x: panel.x,
    y: panel.y,
    w: panel.w,
    h: panel.h,
    radius: 4,
    fill: "none",
    stroke: "dim",
    width: 1,
    opacity: 0.45,
  });
  const my = panel.y + panel.h / 2;
  shapes.push({
    type: "line",
    points: [
      [panel.x + 6, my],
      [panel.x + panel.w - 6, my],
    ],
    tone: "dim",
    width: 1,
    dash: "2 3",
    opacity: 0.5,
  });
  const series: [number, number][] = [];
  let v = (r() - 0.5) * 0.8;
  for (let i = 0; i <= 24; i++) {
    const gauss =
      Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    v += 0.2 * -v + 0.28 * gauss;
    series.push(
      pt(
        panel.x + 6 + (i / 24) * (panel.w - 12),
        my - Math.max(-1, Math.min(1, v)) * (panel.h / 2 - 8),
      ),
    );
  }
  shapes.push({ type: "line", points: series, tone: "brand", width: 1.4 });
  return shapes;
}
