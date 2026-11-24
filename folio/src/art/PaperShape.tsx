import {
  BlurMask,
  DiscretePathEffect,
  Group,
  Path,
  Shader,
  Skia,
  type SkPath,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { shade } from './palette';
import { getEffect, uniformsFor, type ShaderKind } from './shaders';

type PaperShapeProps = {
  /** An SVG path string (page units) or a ready-made Skia path. */
  path: string | SkPath;
  /** Base paper colour (hex). Also the flat-colour fallback. */
  color: string;
  /** Second colour: brush tint, or halftone dot colour. */
  color2?: string;
  shader?: ShaderKind;
  /** Brush stroke angle in degrees. */
  angle?: number;
  /** Brush stroke density, or halftone dot spacing. */
  scale?: number;
  /** Seeds the grain, brush and the deckled edge, so each cut-out differs. */
  seed?: number;
  /** Deckle roughness in page units (0 = clean cut). */
  deckle?: number;
  /** A soft halo behind the shape (moon, lanterns). */
  glow?: string;
  /** Draws the lighter inner edge where the cut catches the light. */
  innerEdge?: boolean;
};

/**
 * One paper cut-out: a path filled with a procedural paper shader, given a
 * torn, deckled outline (DiscretePathEffect) and a lighter inner edge.
 *
 * If the shader can't compile (getEffect returns null) the shape is filled
 * with its flat colour instead, so the art degrades rather than crashing.
 */
function PaperShapeImpl({
  path,
  color,
  color2,
  shader = 'paper',
  angle,
  scale,
  seed = 1,
  deckle = 1.1,
  glow,
  innerEdge = true,
}: PaperShapeProps) {
  const skPath = useMemo<SkPath | null>(
    () => (typeof path === 'string' ? Skia.Path.MakeFromSVGString(path) : path),
    [path],
  );
  const effect = getEffect(shader);
  const uniforms = useMemo(
    () => uniformsFor(shader, { color, color2, angle, scale, seed }),
    [shader, color, color2, angle, scale, seed],
  );
  const edge = useMemo(() => shade(color, -0.35), [color]);
  const light = useMemo(() => shade(color, 0.45), [color]);

  if (!skPath) return null;

  return (
    <Group>
      {glow && (
        <Path path={skPath} color={glow} opacity={0.55}>
          <BlurMask blur={18} style="normal" />
        </Path>
      )}
      {/* The fill, with a slightly rough silhouette. */}
      <Path path={skPath} color={color}>
        {effect ? <Shader source={effect} uniforms={uniforms} /> : null}
        {deckle > 0 ? <DiscretePathEffect length={5} deviation={deckle * 0.6} seed={seed} /> : null}
      </Path>
      {/* Torn fibres along the cut: a thin, darker, jittered stroke. */}
      {deckle > 0 && (
        <Path path={skPath} style="stroke" strokeWidth={0.9} color={edge} opacity={0.45}>
          <DiscretePathEffect length={3} deviation={deckle} seed={seed + 7} />
        </Path>
      )}
      {/* Lighter inner edge: a wide light stroke clipped to the inside. */}
      {innerEdge && (
        <Group clip={skPath}>
          <Path path={skPath} style="stroke" strokeWidth={2.4} color={light} opacity={0.35} />
        </Group>
      )}
    </Group>
  );
}

export const PaperShape = memo(PaperShapeImpl);
