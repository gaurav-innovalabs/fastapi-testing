// Reusable paper-cut motifs, generated procedurally from a seeded RNG so a
// given spec always produces exactly the same shape (on every platform and
// every launch). Generators return SVG path strings, which are easy to
// inspect and test; `motifPath` turns a spec into a Skia path.
//
// All coordinates are page units (DEFAULT_PAGE is 400 x 300).
import { Skia, type SkPath } from '@shopify/react-native-skia';

/** mulberry32: a tiny, fast, deterministic PRNG. Returns floats in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const pt = (x: number, y: number) => `${f(x)} ${f(y)}`;
const range = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r();

type Rect = { x: number; y: number; w: number; h: number };

/** Four-point sparkle stars scattered over an area. */
export function stars(seed: number, count: number, area: Rect, size: [number, number] = [3, 6]): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const cx = area.x + r() * area.w;
    const cy = area.y + r() * area.h;
    const s = range(r, size[0], size[1]);
    const k = s * 0.28;
    d +=
      `M${pt(cx, cy - s)}L${pt(cx + k, cy - k)}L${pt(cx + s, cy)}L${pt(cx + k, cy + k)}` +
      `L${pt(cx, cy + s)}L${pt(cx - k, cy + k)}L${pt(cx - s, cy)}L${pt(cx - k, cy - k)}Z`;
  }
  return d;
}

/**
 * Rolling hills / waves: a smooth crest line around `y` with `bumps`
 * irregular peaks, closed down to `bottom`. Spans slightly past the page
 * edges so parallax never shows a gap.
 */
export function hills(
  seed: number,
  y: number,
  amp: number,
  bumps: number,
  opts: { x0?: number; x1?: number; bottom?: number } = {},
): string {
  const { x0 = -4, x1 = 404, bottom = 300 } = opts;
  const r = rng(seed);
  const n = Math.max(2, Math.round(bumps * 2));
  const step = (x1 - x0) / n;
  const ys: number[] = [];
  for (let i = 0; i <= n; i++) ys.push(y + (i % 2 === 0 ? 1 : -1) * amp * range(r, 0.35, 1));
  let d = `M${pt(x0, bottom)}L${pt(x0, ys[0])}`;
  for (let i = 1; i <= n; i++) {
    const xa = x0 + (i - 1) * step;
    const xb = x0 + i * step;
    // Cubic with flat tangents at each extreme: soft paper-cut crests.
    d += `C${pt(xa + step * 0.5, ys[i - 1])} ${pt(xb - step * 0.5, ys[i])} ${pt(xb, ys[i])}`;
  }
  return `${d}L${pt(x1, bottom)}Z`;
}

/** Thin wavy strips (water ripples), `rows` of them starting at `y`. */
export function waves(seed: number, y: number, rows: number, gap: number, opts: { x0?: number; x1?: number } = {}): string {
  const { x0 = 10, x1 = 390 } = opts;
  const r = rng(seed);
  let d = '';
  for (let row = 0; row < rows; row++) {
    const yy = y + row * gap;
    const a = range(r, 0.8, 1.6);
    const len = range(r, 0.45, 0.85) * (x1 - x0);
    const start = x0 + r() * (x1 - x0 - len);
    const segs = 6;
    const step = len / segs;
    let top = `M${pt(start, yy)}`;
    for (let i = 1; i <= segs; i++) {
      const x = start + i * step;
      top += `Q${pt(x - step / 2, yy + (i % 2 ? -a : a))} ${pt(x, yy)}`;
    }
    let back = '';
    for (let i = segs - 1; i >= 0; i--) {
      const x = start + i * step;
      back += `Q${pt(x + step / 2, yy + 1.6 + (i % 2 ? a : -a))} ${pt(x, yy + 1.6)}`;
    }
    d += `${top}L${pt(start + len, yy + 1.6)}${back}Z`;
  }
  return d;
}

/** Pine trees standing on `baseY`, spread between x0 and x1. */
export function pines(seed: number, count: number, x0: number, x1: number, baseY: number, height: [number, number]): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const cx = x0 + ((i + range(r, 0.2, 0.8)) / count) * (x1 - x0);
    const h = range(r, height[0], height[1]);
    const w = h * range(r, 0.34, 0.42);
    const top = baseY - h;
    const trunk = Math.max(2.5, w * 0.12);
    // Three tiers, each a little wider than the one above.
    const t1 = top + h * 0.34;
    const t2 = top + h * 0.62;
    const t3 = top + h * 0.84;
    d +=
      `M${pt(cx, top)}L${pt(cx + w * 0.3, t1)}L${pt(cx + w * 0.14, t1)}L${pt(cx + w * 0.42, t2)}` +
      `L${pt(cx + w * 0.2, t2)}L${pt(cx + w * 0.5, t3)}L${pt(cx + trunk, t3)}L${pt(cx + trunk, baseY)}` +
      `L${pt(cx - trunk, baseY)}L${pt(cx - trunk, t3)}L${pt(cx - w * 0.5, t3)}L${pt(cx - w * 0.2, t2)}` +
      `L${pt(cx - w * 0.42, t2)}L${pt(cx - w * 0.14, t1)}L${pt(cx - w * 0.3, t1)}Z`;
  }
  return d;
}

/** Almond-shaped leaves scattered (and rotated) over an area. */
export function leaves(seed: number, count: number, area: Rect, size: [number, number] = [6, 12]): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const cx = area.x + r() * area.w;
    const cy = area.y + r() * area.h;
    const len = range(r, size[0], size[1]);
    const wid = len * 0.42;
    const a = r() * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const P = (u: number, v: number) => pt(cx + u * c - v * s, cy + u * s + v * c);
    d += `M${P(-len / 2, 0)}Q${P(0, -wid)} ${P(len / 2, 0)}Q${P(0, wid)} ${P(-len / 2, 0)}Z`;
  }
  return d;
}

/**
 * A scalloped band: a row of half-circle bumps along `y`, closed down to
 * `bottom`. With a small radius it's a bush line; with a big one, clouds.
 */
export function scallops(seed: number, y: number, radius: number, opts: { x0?: number; x1?: number; bottom?: number } = {}): string {
  const { x0 = -4, x1 = 404, bottom = 300 } = opts;
  const r = rng(seed);
  let d = `M${pt(x0, bottom)}L${pt(x0, y)}`;
  let x = x0;
  while (x < x1) {
    const rr = radius * range(r, 0.7, 1.25);
    const nx = Math.min(x1, x + rr * 2);
    const ry = rr * range(r, 0.7, 1.05);
    d += `A${f(rr)} ${f(ry)} 0 0 1 ${pt(nx, y)}`;
    x = nx;
  }
  return `${d}L${pt(x1, bottom)}Z`;
}

/** A free-floating cloud made of scallops on a flat base. */
export function cloud(seed: number, cx: number, cy: number, w: number, h: number): string {
  const r = rng(seed);
  const n = 4;
  const x0 = cx - w / 2;
  const step = w / n;
  let d = `M${pt(x0, cy)}`;
  for (let i = 0; i < n; i++) {
    const ry = h * range(r, 0.5, 1) * (i === 1 || i === 2 ? 1 : 0.7);
    d += `A${f(step / 2)} ${f(ry)} 0 0 1 ${pt(x0 + (i + 1) * step, cy)}`;
  }
  return `${d}Z`;
}

/** A circle as an SVG path (two arcs). */
export function circle(cx: number, cy: number, radius: number): string {
  return `M${pt(cx - radius, cy)}A${f(radius)} ${f(radius)} 0 1 0 ${pt(cx + radius, cy)}A${f(radius)} ${f(radius)} 0 1 0 ${pt(cx - radius, cy)}Z`;
}

/** A crescent moon opening to the right: an outer half-circle and a shallower inner arc. */
export function crescent(cx: number, cy: number, radius: number): string {
  const inner = radius * 1.3;
  return `M${pt(cx, cy - radius)}A${f(radius)} ${f(radius)} 0 0 0 ${pt(cx, cy + radius)}A${f(inner)} ${f(inner)} 0 0 1 ${pt(cx, cy - radius)}Z`;
}

/** A backdrop sheet with slightly irregular, hand-cut edges. */
export function sheet(seed: number, rect: Rect, jag = 4): string {
  const r = rng(seed);
  const j = () => range(r, -jag, jag);
  const { x, y, w, h } = rect;
  return (
    `M${pt(x + j(), y + Math.abs(j()))}L${pt(x + w * 0.3, y + j() * 0.5)}L${pt(x + w * 0.62, y + Math.abs(j()))}` +
    `L${pt(x + w - Math.abs(j()), y + j() * 0.5)}L${pt(x + w + j() * 0.3, y + h)}L${pt(x + j() * 0.3, y + h)}Z`
  );
}

export type MotifSpec =
  | { kind: 'svg'; d: string }
  | { kind: 'stars'; seed: number; count: number; area: Rect; size?: [number, number] }
  | { kind: 'hills'; seed: number; y: number; amp: number; bumps: number; bottom?: number }
  | { kind: 'waves'; seed: number; y: number; rows: number; gap: number; x0?: number; x1?: number }
  | { kind: 'pines'; seed: number; count: number; x0: number; x1: number; baseY: number; height: [number, number] }
  | { kind: 'leaves'; seed: number; count: number; area: Rect; size?: [number, number] }
  | { kind: 'scallops'; seed: number; y: number; radius: number; bottom?: number }
  | { kind: 'cloud'; seed: number; cx: number; cy: number; w: number; h: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'crescent'; cx: number; cy: number; r: number }
  | { kind: 'sheet'; seed: number; rect: Rect; jag?: number };

/** The SVG path string for a motif spec. Pure and deterministic. */
export function motifSvg(m: MotifSpec): string {
  switch (m.kind) {
    case 'svg':
      return m.d;
    case 'stars':
      return stars(m.seed, m.count, m.area, m.size);
    case 'hills':
      return hills(m.seed, m.y, m.amp, m.bumps, { bottom: m.bottom });
    case 'waves':
      return waves(m.seed, m.y, m.rows, m.gap, { x0: m.x0, x1: m.x1 });
    case 'pines':
      return pines(m.seed, m.count, m.x0, m.x1, m.baseY, m.height);
    case 'leaves':
      return leaves(m.seed, m.count, m.area, m.size);
    case 'scallops':
      return scallops(m.seed, m.y, m.radius, { bottom: m.bottom });
    case 'cloud':
      return cloud(m.seed, m.cx, m.cy, m.w, m.h);
    case 'circle':
      return circle(m.cx, m.cy, m.r);
    case 'crescent':
      return crescent(m.cx, m.cy, m.r);
    case 'sheet':
      return sheet(m.seed, m.rect, m.jag);
  }
}

/** A Skia path for a motif spec (null if the SVG somehow fails to parse). */
export function motifPath(m: MotifSpec): SkPath | null {
  return Skia.Path.MakeFromSVGString(motifSvg(m));
}
