// "The Paper Fox Who Followed the Moon" — an original short story for Folio,
// three chapters of two scenes each, with three "dive deeper" sub-scenes.
//
// Scenes are pure data: every layer names a motif (an SVG path or a
// procedural generator from art/patterns.ts), a shader, palette keys and a
// depth z. SceneScreen turns them into PaperShapes inside the PopupCanvas.
import type { PaletteKey } from '../art/palette';
import type { MotifSpec } from '../art/patterns';
import type { ShaderKind } from '../art/shaders';

export type LayerSpec = {
  id: string;
  motif: MotifSpec;
  shader: ShaderKind;
  color: PaletteKey;
  /** Brush tint / halftone dot colour. */
  color2?: PaletteKey;
  /** 0 = back page … 1 = front cut-out. */
  z: number;
  /** Optional placement for motifs drawn in their own local coordinates. */
  at?: { x: number; y: number; s?: number; flip?: boolean };
  angle?: number;
  scale?: number;
  glow?: PaletteKey;
  deckle?: number;
  /** Page y the layer stands up from (defaults to the page bottom). */
  baseY?: number;
};

export type Scene = {
  id: string;
  chapter: number;
  title: string;
  narration: string;
  layers: LayerSpec[];
  /** A closer view reached by pinching (or the Dive deeper button). */
  deeper?: Scene;
};

export type Chapter = { number: number; numeral: string; title: string };

export const chapters: Chapter[] = [
  { number: 1, numeral: 'I', title: 'The Paper Fox' },
  { number: 2, numeral: 'II', title: 'The Lantern Wood' },
  { number: 3, numeral: 'III', title: 'Over the Fold' },
];

// ---- Character and prop cut-outs (local coordinates, placed with `at`) ----

/** A seated fox, about 60 x 52, sitting on y = 50, facing right. */
const FOX_BODY =
  'M8 50 C5 34 15 22 30 21 C38 21 43 24 44 28 L40 7 L47 17 L53 4 L55 20 C61 24 63 30 59 34 ' +
  'C55 37 50 37 47 36 C50 41 51 46 50 50 Z';
/** The fox's brush of a tail, curling round to the left. */
const FOX_TAIL = 'M14 46 C-4 48 -20 40 -18 28 C-14 22 -8 26 -6 30 C-2 37 6 40 16 39 Z';
const FOX_TAIL_TIP = 'M-18 28 C-14 22 -8 26 -6 30 C-9 31 -14 31 -18 28 Z';
/** A sleeping fox curled into a ring, about 70 x 36, base y = 36. */
const FOX_CURLED =
  'M2 36 C0 18 16 6 36 6 C52 6 66 14 68 28 C69 33 67 36 64 36 Z ' +
  'M48 12 L52 0 L58 10 L64 2 L64 14 Z';
const FOX_CURLED_TAIL = 'M4 36 C10 26 26 22 44 26 C56 29 62 34 64 36 Z';

/** An owl, about 40 x 46, sitting on y = 46. */
const OWL = 'M3 46 C0 24 5 8 11 2 L14 11 C18 9 22 9 26 11 L29 2 C35 8 40 24 37 46 Z';
const OWL_EYES = 'M8 18 A6 6 0 1 0 20 18 A6 6 0 1 0 8 18 Z M20 18 A6 6 0 1 0 32 18 A6 6 0 1 0 20 18 Z';
const OWL_PUPILS = 'M12 18 A2 2 0 1 0 16 18 A2 2 0 1 0 12 18 Z M24 18 A2 2 0 1 0 28 18 A2 2 0 1 0 24 18 Z';

function lanterns(points: [number, number, number][]): string {
  return points
    .map(([x, y, s]) => {
      const w = 7 * s;
      const h = 18 * s;
      const string = `M${x - 0.6} ${y - 40} L${x + 0.6} ${y - 40} L${x + 0.6} ${y} L${x - 0.6} ${y} Z`;
      const body =
        `M${x - w * 0.7} ${y} L${x + w * 0.7} ${y} C${x + w * 1.3} ${y + h * 0.3} ${x + w * 1.3} ${y + h * 0.75} ` +
        `${x + w * 0.7} ${y + h} L${x - w * 0.7} ${y + h} C${x - w * 1.3} ${y + h * 0.75} ${x - w * 1.3} ${y + h * 0.3} ${x - w * 0.7} ${y} Z`;
      return string + body;
    })
    .join(' ');
}

function bookStacks(seed: number, x0: number, baseY: number, stacks: number): string {
  let d = '';
  let x = x0;
  let s = seed;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < stacks; i++) {
    let y = baseY;
    const books = 3 + Math.floor(next() * 3);
    for (let b = 0; b < books; b++) {
      const w = 26 + next() * 14;
      const h = 6 + next() * 4;
      const off = (next() - 0.5) * 6;
      d += `M${(x + off).toFixed(1)} ${y.toFixed(1)} L${(x + off + w).toFixed(1)} ${y.toFixed(1)} L${(x + off + w).toFixed(1)} ${(y - h).toFixed(1)} L${(x + off).toFixed(1)} ${(y - h).toFixed(1)} Z `;
      y -= h + 0.8;
    }
    x += 46;
  }
  return d;
}

const SKY_SHEET: MotifSpec = { kind: 'sheet', seed: 11, rect: { x: 28, y: 18, w: 344, h: 262 } };

// ---- Scenes ----

const foxScene: Scene = {
  id: '1.1',
  chapter: 1,
  title: 'The Paper Fox',
  narration: 'Every night the paper fox folded himself small, and followed the moon across the page.',
  layers: [
    { id: 'sky', motif: SKY_SHEET, shader: 'brush', color: 'sky', color2: 'sky2', z: 0, angle: -20 },
    { id: 'stars', motif: { kind: 'stars', seed: 3, count: 9, area: { x: 50, y: 30, w: 300, h: 110 } }, shader: 'flat', color: 'star', z: 0.08, deckle: 0 },
    { id: 'moon', motif: { kind: 'circle', cx: 286, cy: 74, r: 30 }, shader: 'paper', color: 'glow', glow: 'glow', z: 0.14 },
    { id: 'far-hills', motif: { kind: 'hills', seed: 21, y: 196, amp: 20, bumps: 3 }, shader: 'brush', color: 'hillFar', color2: 'sky2', z: 0.3, angle: 8 },
    { id: 'pines', motif: { kind: 'pines', seed: 5, count: 2, x0: 50, x1: 140, baseY: 246, height: [74, 104] }, shader: 'paper', color: 'leaf', z: 0.48 },
    { id: 'mid-hills', motif: { kind: 'hills', seed: 8, y: 232, amp: 10, bumps: 4 }, shader: 'halftone', color: 'hillMid', color2: 'cream', z: 0.62, scale: 6 },
    { id: 'fox-tail', motif: { kind: 'svg', d: FOX_TAIL }, shader: 'brush', color: 'fox2', color2: 'fox', z: 0.78, at: { x: 196, y: 196 } },
    { id: 'fox-tail-tip', motif: { kind: 'svg', d: FOX_TAIL_TIP }, shader: 'paper', color: 'cream', z: 0.79, at: { x: 196, y: 196 } },
    { id: 'fox', motif: { kind: 'svg', d: FOX_BODY }, shader: 'brush', color: 'fox', color2: 'fox2', z: 0.8, angle: 60, scale: 3, at: { x: 196, y: 196 } },
    { id: 'ground', motif: { kind: 'hills', seed: 34, y: 262, amp: 9, bumps: 3 }, shader: 'brush', color: 'ground', color2: 'ground2', z: 1, angle: -10, scale: 2 },
  ],
  deeper: {
    id: '1.1+',
    chapter: 1,
    title: 'Inside the Fold',
    narration: 'Deep in the crease of the page, the fox kept a map of every hill the moon had crossed.',
    layers: [
      { id: 'sky', motif: SKY_SHEET, shader: 'brush', color: 'sky', color2: 'sky2', z: 0, angle: 30 },
      { id: 'stars', motif: { kind: 'stars', seed: 41, count: 16, area: { x: 40, y: 26, w: 320, h: 160 }, size: [2, 5] }, shader: 'flat', color: 'star', z: 0.1, deckle: 0 },
      { id: 'moon', motif: { kind: 'circle', cx: 200, cy: 96, r: 52 }, shader: 'paper', color: 'glow', glow: 'glow', z: 0.16 },
      { id: 'den', motif: { kind: 'scallops', seed: 6, y: 210, radius: 30 }, shader: 'halftone', color: 'hillMid', color2: 'cream', z: 0.4, scale: 7 },
      { id: 'leaves', motif: { kind: 'leaves', seed: 12, count: 14, area: { x: 40, y: 190, w: 320, h: 50 } }, shader: 'paper', color: 'leaf2', z: 0.55 },
      { id: 'fox-tail', motif: { kind: 'svg', d: FOX_CURLED_TAIL }, shader: 'brush', color: 'fox2', color2: 'fox', z: 0.74, at: { x: 130, y: 196, s: 2 } },
      { id: 'fox', motif: { kind: 'svg', d: FOX_CURLED }, shader: 'brush', color: 'fox', color2: 'fox2', z: 0.72, angle: 50, scale: 3, at: { x: 130, y: 196, s: 2 } },
      { id: 'ground', motif: { kind: 'hills', seed: 77, y: 270, amp: 6, bumps: 4 }, shader: 'brush', color: 'ground', color2: 'ground2', z: 1, angle: -6, scale: 2 },
    ],
  },
};

const pondScene: Scene = {
  id: '1.2',
  chapter: 1,
  title: 'Moon on the Pond',
  narration: 'At the pond the moon lay down in the water, and the fox wondered which one was real.',
  layers: [
    { id: 'sky', motif: SKY_SHEET, shader: 'brush', color: 'sky', color2: 'sky2', z: 0, angle: -8 },
    { id: 'stars', motif: { kind: 'stars', seed: 17, count: 8, area: { x: 50, y: 30, w: 300, h: 100 } }, shader: 'flat', color: 'star', z: 0.08, deckle: 0 },
    { id: 'moon', motif: { kind: 'circle', cx: 120, cy: 70, r: 26 }, shader: 'paper', color: 'glow', glow: 'glow', z: 0.14 },
    { id: 'far-hills', motif: { kind: 'hills', seed: 4, y: 184, amp: 16, bumps: 2 }, shader: 'brush', color: 'hillFar', color2: 'sky2', z: 0.28 },
    { id: 'pond', motif: { kind: 'svg', d: 'M60 236 C60 214 140 204 210 204 C290 204 350 214 350 236 C350 258 290 266 205 266 C130 266 60 258 60 236 Z' }, shader: 'halftone', color: 'water', color2: 'water2', z: 0.5, scale: 5 },
    { id: 'reflection', motif: { kind: 'svg', d: 'M100 230 C100 222 112 218 124 218 C136 218 148 222 148 230 C148 238 136 241 124 241 C112 241 100 238 100 230 Z' }, shader: 'paper', color: 'glow', z: 0.52, glow: 'glow', deckle: 0.6 },
    { id: 'ripples', motif: { kind: 'waves', seed: 9, y: 220, rows: 4, gap: 9, x0: 90, x1: 330 }, shader: 'flat', color: 'cream', z: 0.55, deckle: 0 },
    { id: 'reeds', motif: { kind: 'leaves', seed: 31, count: 10, area: { x: 300, y: 196, w: 70, h: 40 }, size: [10, 18] }, shader: 'paper', color: 'leaf', z: 0.66 },
    { id: 'fox-tail', motif: { kind: 'svg', d: FOX_TAIL }, shader: 'brush', color: 'fox2', color2: 'fox', z: 0.78, at: { x: 250, y: 214, s: 0.9, flip: true } },
    { id: 'fox-tail-tip', motif: { kind: 'svg', d: FOX_TAIL_TIP }, shader: 'paper', color: 'cream', z: 0.79, at: { x: 250, y: 214, s: 0.9, flip: true } },
    { id: 'fox', motif: { kind: 'svg', d: FOX_BODY }, shader: 'brush', color: 'fox', color2: 'fox2', z: 0.8, angle: 60, scale: 3, at: { x: 250, y: 214, s: 0.9, flip: true } },
    { id: 'bank', motif: { kind: 'scallops', seed: 23, y: 272, radius: 14 }, shader: 'brush', color: 'hillMid', color2: 'leaf', z: 1, angle: 0, scale: 2 },
  ],
};

const lanternScene: Scene = {
  id: '2.1',
  chapter: 2,
  title: 'The Lantern Wood',
  narration: 'In the wood, someone had hung a hundred little moons, and none of them would answer.',
  layers: [
    { id: 'sky', motif: SKY_SHEET, shader: 'brush', color: 'sky', color2: 'sky2', z: 0, angle: 70 },
    { id: 'moon', motif: { kind: 'crescent', cx: 300, cy: 66, r: 24 }, shader: 'paper', color: 'glow', glow: 'glow', z: 0.12 },
    { id: 'far-pines', motif: { kind: 'pines', seed: 14, count: 7, x0: 30, x1: 370, baseY: 236, height: [70, 110] }, shader: 'brush', color: 'hillFar', color2: 'sky2', z: 0.28, angle: 90 },
    { id: 'lanterns', motif: { kind: 'svg', d: lanterns([[90, 104, 1], [168, 86, 0.8], [236, 112, 1.1], [320, 120, 0.9]]) }, shader: 'paper', color: 'accent', glow: 'glow', z: 0.46 },
    { id: 'pines', motif: { kind: 'pines', seed: 27, count: 3, x0: 20, x1: 380, baseY: 252, height: [110, 150] }, shader: 'halftone', color: 'leaf', color2: 'leaf2', z: 0.6, scale: 6 },
    { id: 'fox-tail', motif: { kind: 'svg', d: FOX_TAIL }, shader: 'brush', color: 'fox2', color2: 'fox', z: 0.78, at: { x: 176, y: 210, s: 0.9 } },
    { id: 'fox-tail-tip', motif: { kind: 'svg', d: FOX_TAIL_TIP }, shader: 'paper', color: 'cream', z: 0.79, at: { x: 176, y: 210, s: 0.9 } },
    { id: 'fox', motif: { kind: 'svg', d: FOX_BODY }, shader: 'brush', color: 'fox', color2: 'fox2', z: 0.8, angle: 60, scale: 3, at: { x: 176, y: 210, s: 0.9 } },
    { id: 'ground', motif: { kind: 'scallops', seed: 52, y: 262, radius: 18 }, shader: 'brush', color: 'ground', color2: 'ground2', z: 1, angle: -14, scale: 2 },
  ],
  deeper: {
    id: '2.1+',
    chapter: 2,
    title: 'The Lantern Keeper',
    narration: 'Up close, each lantern was a folded letter, and every letter was addressed to the moon.',
    layers: [
      { id: 'sky', motif: SKY_SHEET, shader: 'brush', color: 'sky', color2: 'sky2', z: 0, angle: 60 },
      { id: 'leaves-back', motif: { kind: 'leaves', seed: 61, count: 22, area: { x: 40, y: 30, w: 320, h: 200 }, size: [8, 14] }, shader: 'paper', color: 'hillFar', z: 0.2 },
      { id: 'lanterns', motif: { kind: 'svg', d: lanterns([[120, 80, 2.2], [270, 96, 2.6]]) }, shader: 'brush', color: 'accent', color2: 'glow', glow: 'glow', z: 0.5, angle: 90, scale: 2 },
      { id: 'leaves-front', motif: { kind: 'leaves', seed: 88, count: 12, area: { x: 30, y: 200, w: 340, h: 70 }, size: [12, 20] }, shader: 'halftone', color: 'leaf', color2: 'leaf2', z: 0.85, scale: 5 },
      { id: 'ground', motif: { kind: 'scallops', seed: 19, y: 272, radius: 12 }, shader: 'brush', color: 'ground', color2: 'ground2', z: 1, scale: 2 },
    ],
  },
};

const owlScene: Scene = {
  id: '2.2',
  chapter: 2,
  title: "Owl's Library",
  narration: 'The owl kept every story the wood had ever told. "The moon," she said, "is only ever just ahead."',
  layers: [
    { id: 'sky', motif: SKY_SHEET, shader: 'brush', color: 'sky', color2: 'sky2', z: 0, angle: -30 },
    { id: 'stars', motif: { kind: 'stars', seed: 71, count: 7, area: { x: 200, y: 30, w: 160, h: 100 } }, shader: 'flat', color: 'star', z: 0.08, deckle: 0 },
    { id: 'moon', motif: { kind: 'crescent', cx: 316, cy: 70, r: 22 }, shader: 'paper', color: 'glow', glow: 'glow', z: 0.12 },
    { id: 'tree', motif: { kind: 'svg', d: 'M60 270 C70 200 66 140 50 90 C70 96 82 80 86 56 C96 78 116 86 132 80 C116 130 112 200 124 270 Z' }, shader: 'brush', color: 'ground', color2: 'ground2', z: 0.32, angle: 90, scale: 3 },
    { id: 'canopy', motif: { kind: 'leaves', seed: 5, count: 26, area: { x: 30, y: 36, w: 140, h: 70 }, size: [10, 18] }, shader: 'paper', color: 'leaf', z: 0.38 },
    { id: 'owl', motif: { kind: 'svg', d: OWL }, shader: 'brush', color: 'hillFar', color2: 'cream', z: 0.5, angle: 90, scale: 4, at: { x: 72, y: 120, s: 1.1 } },
    { id: 'owl-eyes', motif: { kind: 'svg', d: OWL_EYES }, shader: 'paper', color: 'cream', z: 0.52, at: { x: 72, y: 120, s: 1.1 }, deckle: 0.4 },
    { id: 'owl-pupils', motif: { kind: 'svg', d: OWL_PUPILS }, shader: 'flat', color: 'sky', z: 0.53, at: { x: 72, y: 120, s: 1.1 }, deckle: 0 },
    { id: 'books', motif: { kind: 'svg', d: bookStacks(7, 190, 252, 4) }, shader: 'halftone', color: 'accent', color2: 'cream', z: 0.66, scale: 4 },
    { id: 'fox-tail', motif: { kind: 'svg', d: FOX_TAIL }, shader: 'brush', color: 'fox2', color2: 'fox', z: 0.78, at: { x: 150, y: 214, s: 0.8, flip: true } },
    { id: 'fox-tail-tip', motif: { kind: 'svg', d: FOX_TAIL_TIP }, shader: 'paper', color: 'cream', z: 0.79, at: { x: 150, y: 214, s: 0.8, flip: true } },
    { id: 'fox', motif: { kind: 'svg', d: FOX_BODY }, shader: 'brush', color: 'fox', color2: 'fox2', z: 0.8, angle: 60, scale: 3, at: { x: 150, y: 214, s: 0.8, flip: true } },
    { id: 'ground', motif: { kind: 'hills', seed: 91, y: 258, amp: 6, bumps: 3 }, shader: 'brush', color: 'hillMid', color2: 'leaf', z: 1, scale: 2 },
  ],
};

const foldScene: Scene = {
  id: '3.1',
  chapter: 3,
  title: 'Over the Fold',
  narration: 'He climbed to the very edge of the page, where the paper bends, and the moon began to set.',
  layers: [
    { id: 'sky', motif: SKY_SHEET, shader: 'brush', color: 'sky', color2: 'sky2', z: 0, angle: 0 },
    { id: 'moon', motif: { kind: 'circle', cx: 300, cy: 130, r: 30 }, shader: 'paper', color: 'glow', glow: 'glow', z: 0.1 },
    { id: 'clouds', motif: { kind: 'svg', d: 'M60 80 A14 10 0 0 1 88 80 A16 16 0 0 1 120 80 A12 9 0 0 1 144 80 Z M220 60 A12 9 0 0 1 244 60 A15 14 0 0 1 274 60 A11 8 0 0 1 296 60 Z' }, shader: 'paper', color: 'cream', z: 0.2 },
    { id: 'mountains', motif: { kind: 'svg', d: 'M-4 300 L-4 210 L50 140 L96 186 L160 96 L226 172 L282 126 L404 214 L404 300 Z' }, shader: 'brush', color: 'hillFar', color2: 'sky2', z: 0.36, angle: 40, scale: 2 },
    { id: 'snow', motif: { kind: 'svg', d: 'M160 96 L180 124 L170 120 L160 130 L150 120 L140 126 Z M50 140 L64 154 L50 150 L38 152 Z' }, shader: 'paper', color: 'cream', z: 0.37 },
    { id: 'near-hill', motif: { kind: 'hills', seed: 12, y: 236, amp: 18, bumps: 2 }, shader: 'halftone', color: 'hillMid', color2: 'cream', z: 0.6, scale: 6 },
    { id: 'fox-tail', motif: { kind: 'svg', d: FOX_TAIL }, shader: 'brush', color: 'fox2', color2: 'fox', z: 0.78, at: { x: 100, y: 180, s: 0.8 } },
    { id: 'fox-tail-tip', motif: { kind: 'svg', d: FOX_TAIL_TIP }, shader: 'paper', color: 'cream', z: 0.79, at: { x: 100, y: 180, s: 0.8 } },
    { id: 'fox', motif: { kind: 'svg', d: FOX_BODY }, shader: 'brush', color: 'fox', color2: 'fox2', z: 0.8, angle: 60, scale: 3, at: { x: 100, y: 180, s: 0.8 } },
    { id: 'ground', motif: { kind: 'hills', seed: 66, y: 266, amp: 8, bumps: 4 }, shader: 'brush', color: 'ground', color2: 'ground2', z: 1, scale: 2 },
  ],
  deeper: {
    id: '3.1+',
    chapter: 3,
    title: 'The Edge of the Page',
    narration: 'Past the fold there was only white paper, waiting, and the moon slipping down into it.',
    layers: [
      { id: 'sky', motif: SKY_SHEET, shader: 'brush', color: 'sky2', color2: 'cream', z: 0, angle: -40 },
      { id: 'moon', motif: { kind: 'circle', cx: 200, cy: 168, r: 56 }, shader: 'paper', color: 'glow', glow: 'glow', z: 0.14 },
      { id: 'cloud', motif: { kind: 'cloud', seed: 4, cx: 200, cy: 196, w: 220, h: 30 }, shader: 'paper', color: 'cream', z: 0.3 },
      { id: 'cliff', motif: { kind: 'svg', d: 'M-4 300 L-4 196 L60 186 L120 204 L150 230 L170 300 Z' }, shader: 'brush', color: 'hillFar', color2: 'sky', z: 0.6, angle: 70, scale: 2 },
      { id: 'fox', motif: { kind: 'svg', d: FOX_BODY }, shader: 'brush', color: 'fox', color2: 'fox2', z: 0.7, angle: 60, scale: 3, at: { x: 60, y: 138, s: 1 } },
      { id: 'ground', motif: { kind: 'hills', seed: 3, y: 276, amp: 6, bumps: 5 }, shader: 'brush', color: 'ground', color2: 'ground2', z: 1, scale: 2 },
    ],
  },
};

const morningScene: Scene = {
  id: '3.2',
  chapter: 3,
  title: 'Morning Page',
  narration: 'When the sun turned the page, the fox curled up to sleep. The moon would wait for him tonight.',
  layers: [
    { id: 'sky', motif: SKY_SHEET, shader: 'brush', color: 'sky', color2: 'sky2', z: 0, angle: 90 },
    { id: 'sun', motif: { kind: 'circle', cx: 200, cy: 150, r: 40 }, shader: 'paper', color: 'glow', glow: 'glow', z: 0.12 },
    { id: 'clouds', motif: { kind: 'svg', d: 'M70 70 A14 10 0 0 1 98 70 A16 16 0 0 1 130 70 A12 9 0 0 1 154 70 Z M250 92 A12 9 0 0 1 274 92 A15 14 0 0 1 304 92 A11 8 0 0 1 326 92 Z' }, shader: 'paper', color: 'cream', z: 0.2 },
    { id: 'far-hills', motif: { kind: 'hills', seed: 44, y: 192, amp: 14, bumps: 3 }, shader: 'brush', color: 'hillFar', color2: 'sky', z: 0.3 },
    { id: 'mid-hills', motif: { kind: 'scallops', seed: 15, y: 228, radius: 26 }, shader: 'halftone', color: 'leaf', color2: 'cream', z: 0.55, scale: 6 },
    { id: 'leaves', motif: { kind: 'leaves', seed: 99, count: 12, area: { x: 40, y: 206, w: 320, h: 40 } }, shader: 'paper', color: 'leaf2', z: 0.62 },
    { id: 'fox-tail', motif: { kind: 'svg', d: FOX_CURLED_TAIL }, shader: 'brush', color: 'fox2', color2: 'fox', z: 0.8, at: { x: 160, y: 218, s: 1.1 } },
    { id: 'fox', motif: { kind: 'svg', d: FOX_CURLED }, shader: 'brush', color: 'fox', color2: 'fox2', z: 0.78, angle: 50, scale: 3, at: { x: 160, y: 218, s: 1.1 } },
    { id: 'ground', motif: { kind: 'hills', seed: 58, y: 262, amp: 8, bumps: 3 }, shader: 'brush', color: 'ground', color2: 'ground2', z: 1, scale: 2 },
  ],
};

/** All top-level scenes, in reading order. */
export const scenes: Scene[] = [foxScene, pondScene, lanternScene, owlScene, foldScene, morningScene];

export function chapterOf(scene: Scene): Chapter {
  return chapters.find((c) => c.number === scene.chapter) ?? chapters[0];
}

/** Scenes of one chapter, in order. */
export function scenesInChapter(chapter: number): Scene[] {
  return scenes.filter((s) => s.chapter === chapter);
}

/** 1-based position of a top-level scene within its chapter, and the chapter's scene count. */
export function sceneNumbering(index: number): { n: number; of: number } {
  const scene = scenes[index];
  if (!scene) return { n: 1, of: 1 };
  const inChapter = scenesInChapter(scene.chapter);
  return { n: inChapter.indexOf(scene) + 1, of: inChapter.length };
}
