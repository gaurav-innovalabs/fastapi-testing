// Chapter colour palettes. Every layer in story.ts names a palette *key*
// (e.g. 'sky', 'fox') rather than a colour, so a scene picks up its
// chapter's mood and a palette can be retuned in one place.

export type PaletteKey =
  | 'sky'
  | 'sky2'
  | 'glow'
  | 'star'
  | 'hillFar'
  | 'hillMid'
  | 'leaf'
  | 'leaf2'
  | 'ground'
  | 'ground2'
  | 'fox'
  | 'fox2'
  | 'cream'
  | 'water'
  | 'water2'
  | 'accent';

export type Palette = Record<PaletteKey, string>;

/** The UI's own colours (paper, ink), shared by every screen. */
export const ui = {
  paper: '#F4ECDC',
  paper2: '#E9DCC3',
  card: '#FFF8EA',
  ink: '#2B2340',
  inkSoft: '#6B6180',
  line: 'rgba(43,35,64,0.18)',
  fox: '#D9682B',
} as const;

const night: Palette = {
  sky: '#23305E',
  sky2: '#3C4F8F',
  glow: '#F6E7B0',
  star: '#D8A943',
  hillFar: '#4D5F9B',
  hillMid: '#2C5E44',
  leaf: '#3F7D5A',
  leaf2: '#4F9467',
  ground: '#6B4A2E',
  ground2: '#8A6540',
  fox: '#D9682B',
  fox2: '#B44D1C',
  cream: '#F4ECDC',
  water: '#2E4A86',
  water2: '#5B78B8',
  accent: '#B23A48',
};

const lantern: Palette = {
  sky: '#2E2550',
  sky2: '#5A3F7E',
  glow: '#FFD27A',
  star: '#F2B84B',
  hillFar: '#4A3C6E',
  hillMid: '#2D4F3F',
  leaf: '#356B4E',
  leaf2: '#5C8E5A',
  ground: '#5A3A2C',
  ground2: '#7C5236',
  fox: '#D9682B',
  fox2: '#B44D1C',
  cream: '#F6EAD3',
  water: '#3B3368',
  water2: '#6E5E9E',
  accent: '#E58B3A',
};

const dawn: Palette = {
  sky: '#E9A86A',
  sky2: '#F6D9A0',
  glow: '#FFF1C9',
  star: '#FFFFFF',
  hillFar: '#B97A6A',
  hillMid: '#7A5A3A',
  leaf: '#5E8A4E',
  leaf2: '#86A85C',
  ground: '#7C4E2E',
  ground2: '#A26E40',
  fox: '#D9682B',
  fox2: '#A8441A',
  cream: '#FFF4E0',
  water: '#6E8FB8',
  water2: '#A9C2DC',
  accent: '#C2475A',
};

/** Palette per chapter number (1-based). */
export const chapterPalettes: Record<number, Palette> = {
  1: night,
  2: lantern,
  3: dawn,
};

export function paletteFor(chapter: number): Palette {
  return chapterPalettes[chapter] ?? night;
}

/** '#RRGGBB' (or '#RGB') to a [r, g, b, a] float array for shader uniforms. */
export function hexToRgba(hex: string, alpha = 1): [number, number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0.5, 0.5, 0.5, alpha];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
}

/** Mixes a hex colour towards white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgba(hex);
  const t = Math.min(1, Math.abs(amount));
  const target = amount >= 0 ? 1 : 0;
  const mix = (c: number) => Math.round((c + (target - c) * t) * 255);
  const to2 = (c: number) => c.toString(16).padStart(2, '0');
  return `#${to2(mix(r))}${to2(mix(g))}${to2(mix(b))}`;
}
