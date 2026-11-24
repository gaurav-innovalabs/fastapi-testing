// Procedural paper textures as SkSL runtime shaders. There are no bundled
// images: grain, brush strokes and halftone dots are all computed per pixel.
//
// Each effect is compiled once, lazily, with Skia.RuntimeEffect.Make. If a
// compile fails (null, or a throw on some web GPU / CanvasKit builds), the
// getter returns null and PaperShape falls back to a flat colour, so a bad
// shader can never crash the app.
import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

import { hexToRgba } from './palette';

export type ShaderKind = 'paper' | 'brush' | 'halftone' | 'flat';

// Shared helpers: hash, value noise, fbm and a fibre/grain term. Coordinates
// are in page units (the canvas is scaled to fit), so textures scale with
// the book instead of shimmering when the window resizes.
const NOISE = `
float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(float2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p = p * 2.03 + float2(17.0, 9.0);
    amp *= 0.5;
  }
  return v;
}
// Paper grain: fine speckle plus long, thin fibres running mostly sideways.
float grain(float2 p, float seed) {
  float speck = vnoise(p * 1.7 + seed) - 0.5;
  float fibre = vnoise(float2(p.x * 0.08, p.y * 1.3) + seed * 3.1);
  fibre = smoothstep(0.72, 0.95, fibre);
  return speck * 0.09 - fibre * 0.07;
}
`;

/** Flat paper colour with grain and fibres. Uniforms: color, seed. */
export const PAPER_GRAIN_SKSL = `
uniform float4 color;
uniform float seed;
${NOISE}
half4 main(float2 p) {
  float g = grain(p, seed);
  float blotch = (fbm(p * 0.02 + seed) - 0.5) * 0.10;
  float3 c = color.rgb * (1.0 + g + blotch);
  return half4(half3(clamp(c, 0.0, 1.0)), 1.0);
}
`;

/**
 * Directional brush wash: fbm stretched along an angle gives long strokes,
 * tinted between colorA and colorB. Uniforms: colorA, colorB, angle
 * (radians), scale (stroke density), seed.
 */
export const BRUSH_WASH_SKSL = `
uniform float4 colorA;
uniform float4 colorB;
uniform float angle;
uniform float scale;
uniform float seed;
${NOISE}
half4 main(float2 p) {
  float s = sin(angle);
  float c = cos(angle);
  float2 q = float2(c * p.x + s * p.y, -s * p.x + c * p.y);
  // Stretched along the stroke direction, tight across it.
  float2 st = float2(q.x * 0.012, q.y * 0.09) * scale;
  float w = fbm(st + seed);
  float streak = vnoise(float2(q.x * 0.004, q.y * 0.35) * scale + seed * 2.0);
  float t = clamp(w * 0.9 + streak * 0.35 - 0.1, 0.0, 1.0);
  float3 col = mix(colorA.rgb, colorB.rgb, smoothstep(0.2, 0.85, t));
  // Dry-brush edges: a few darker bristle lines.
  col *= 1.0 - smoothstep(0.82, 0.98, streak) * 0.12;
  col *= 1.0 + grain(p, seed);
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}
`;

/**
 * Halftone dots on a rotated grid. Uniforms: base, dotColor, spacing (page
 * units), radius (0..0.5 of spacing), seed.
 */
export const HALFTONE_SKSL = `
uniform float4 base;
uniform float4 dotColor;
uniform float spacing;
uniform float radius;
uniform float seed;
${NOISE}
half4 main(float2 p) {
  float a = 0.5236; // 30 degrees, like a printer's screen angle
  float2 q = float2(cos(a) * p.x - sin(a) * p.y, sin(a) * p.x + cos(a) * p.y) / spacing;
  float2 cell = fract(q) - 0.5;
  // Dot size breathes a little across the sheet so it reads as printed.
  float r = radius * (0.8 + 0.4 * vnoise(floor(q) * 0.15 + seed));
  float d = length(cell);
  float ink = 1.0 - smoothstep(r - 0.06, r + 0.06, d);
  float3 col = mix(base.rgb, dotColor.rgb, ink * dotColor.a);
  col *= 1.0 + grain(p, seed);
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}
`;

const SOURCES = {
  paper: PAPER_GRAIN_SKSL,
  brush: BRUSH_WASH_SKSL,
  halftone: HALFTONE_SKSL,
} as const;

type CompiledKind = keyof typeof SOURCES;

const cache = new Map<CompiledKind, SkRuntimeEffect | null>();

/** Compiles (once) and returns the effect, or null if it can't compile here. */
export function getEffect(kind: ShaderKind): SkRuntimeEffect | null {
  if (kind === 'flat') return null;
  if (cache.has(kind)) return cache.get(kind) ?? null;
  let effect: SkRuntimeEffect | null = null;
  try {
    effect = Skia.RuntimeEffect.Make(SOURCES[kind]);
  } catch {
    effect = null;
  }
  if (!effect) console.warn(`Folio: shader '${kind}' failed to compile; using flat colour.`);
  cache.set(kind, effect);
  return effect;
}

export type ShaderParams = {
  /** Main colour (hex). */
  color: string;
  /** Second colour for brush (tint) and halftone (dot). */
  color2?: string;
  /** Brush stroke angle, degrees. */
  angle?: number;
  /** Brush stroke density, or halftone dot spacing. */
  scale?: number;
  seed?: number;
};

type Uniforms = Record<string, number | number[]>;

/** Builds the uniforms for a shader kind from colours and options. */
export function uniformsFor(kind: ShaderKind, p: ShaderParams): Uniforms {
  const seed = p.seed ?? 1;
  switch (kind) {
    case 'brush':
      return {
        colorA: hexToRgba(p.color),
        colorB: hexToRgba(p.color2 ?? p.color),
        angle: ((p.angle ?? -12) * Math.PI) / 180,
        scale: p.scale ?? 1,
        seed,
      };
    case 'halftone':
      return {
        base: hexToRgba(p.color),
        dotColor: hexToRgba(p.color2 ?? '#FFFFFF', 0.22),
        spacing: p.scale ?? 7,
        radius: 0.22,
        seed,
      };
    case 'paper':
    case 'flat':
    default:
      return { color: hexToRgba(p.color), seed };
  }
}
