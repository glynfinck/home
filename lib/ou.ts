/**
 * The Ornstein-Uhlenbeck path behind the home page hero.
 *
 *   dX = mu (theta - X) dt + sigma dW
 *
 * simulated with an Euler step, and traded the way the pairs-trading post
 * trades it: enter when the path falls through the entry level d*, exit when
 * it rises through the exit level b*. Pure, so it is testable and so the
 * component only has to draw.
 */

export const OU = {
  // Half the steps of a dense path, with mu doubled and sigma scaled by
  // sqrt(2) to match: the same process at a coarser dt, which reads as a line
  // rather than a scribble at hero width.
  steps: 260,
  mu: 0.09,
  sigma: 0.1,
  theta: 0,
  /** Exit and entry levels, symmetric about theta. */
  exit: 0.3,
  entry: -0.3,
} as const;

export type Trade = { step: number; kind: "enter" | "exit" };

/** mulberry32: a small deterministic PRNG, so a seed reproduces a path. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateOu(seed: number): { path: number[]; trades: Trade[] } {
  const r = random(seed);
  // Box-Muller. `1 - r()` keeps the log argument in (0, 1].
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

  const path: number[] = [];
  const trades: Trade[] = [];
  let x = 0.1;
  let holding = false;
  for (let step = 0; step < OU.steps; step++) {
    x += OU.mu * (OU.theta - x) + OU.sigma * gauss();
    path.push(x);
    if (!holding && x < OU.entry) {
      holding = true;
      trades.push({ step, kind: "enter" });
    } else if (holding && x > OU.exit) {
      holding = false;
      trades.push({ step, kind: "exit" });
    }
  }
  return { path, trades };
}
