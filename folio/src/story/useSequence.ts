// The scene sequence as a small state machine:
//
//   index ──pick──▶ chapterCard ──(timer)──▶ scene ──dive──▶ deeper
//     ▲                  ▲                     │  ▲            │
//     └──── openIndex ───┴──── next / prev ────┘  └── surface ─┘
//
// `chapterCard` is a short title card shown when a chapter starts (and,
// briefly, when diving into a sub-scene); it times out into `scene`.
import { useEffect, useMemo, useReducer } from 'react';

import { chapterOf, sceneNumbering, scenes, type Scene } from './story';

export type Mode = 'index' | 'chapterCard' | 'scene';

export type SequenceState = {
  mode: Mode;
  /** Index into `scenes` (top-level scenes only). */
  index: number;
  /** True while showing the current scene's `deeper` sub-scene. */
  deeper: boolean;
};

type Action =
  | { type: 'goTo'; index: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'deeper' }
  | { type: 'surface' }
  | { type: 'openIndex' }
  | { type: 'closeIndex' }
  | { type: 'cardDone' };

const last = scenes.length - 1;

/** Opening a scene shows the chapter card if the chapter changed (or on request). */
function enter(state: SequenceState, index: number, forceCard = false): SequenceState {
  const i = ((index % scenes.length) + scenes.length) % scenes.length;
  const newChapter = scenes[i].chapter !== scenes[state.index].chapter;
  return { mode: forceCard || newChapter ? 'chapterCard' : 'scene', index: i, deeper: false };
}

export function reduce(state: SequenceState, action: Action): SequenceState {
  switch (action.type) {
    case 'goTo':
      return enter(state, action.index, true);
    case 'next':
      // From a sub-scene, Next moves on to the following scene. The last
      // scene wraps to the first, so the showreel loops.
      return enter(state, state.index >= last ? 0 : state.index + 1);
    case 'prev':
      if (state.deeper) return { ...state, deeper: false, mode: 'scene' };
      return enter(state, state.index <= 0 ? last : state.index - 1);
    case 'deeper':
      if (state.deeper || !scenes[state.index].deeper) return state;
      return { ...state, deeper: true, mode: 'chapterCard' };
    case 'surface':
      return state.deeper ? { ...state, deeper: false, mode: 'scene' } : state;
    case 'openIndex':
      return { ...state, mode: 'index' };
    case 'closeIndex':
      return state.mode === 'index' ? { ...state, mode: 'scene' } : state;
    case 'cardDone':
      return state.mode === 'chapterCard' ? { ...state, mode: 'scene' } : state;
  }
}

/** How long the chapter card stays up (ms); a dive shows it more briefly. */
export const CARD_MS = 1400;
export const DIVE_CARD_MS = 800;

export function useSequence(initial: Partial<SequenceState> = {}) {
  const [state, dispatch] = useReducer(reduce, {
    mode: initial.mode ?? 'chapterCard',
    index: initial.index ?? 0,
    deeper: initial.deeper ?? false,
  });

  // The chapter card times out into the scene by itself. The countdown
  // starts after the card's first painted frame: a scene change can keep
  // the JS thread busy redrawing the canvas (especially on web), and the
  // card should still get its full time on screen.
  useEffect(() => {
    if (state.mode !== 'chapterCard') return;
    let t: ReturnType<typeof setTimeout> | undefined;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        t = setTimeout(() => dispatch({ type: 'cardDone' }), state.deeper ? DIVE_CARD_MS : CARD_MS);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (t) clearTimeout(t);
    };
  }, [state.mode, state.deeper, state.index]);

  const top = scenes[state.index];
  const scene: Scene = state.deeper && top.deeper ? top.deeper : top;
  const chapter = chapterOf(top);
  const numbering = sceneNumbering(state.index);

  const actions = useMemo(
    () => ({
      next: () => dispatch({ type: 'next' }),
      prev: () => dispatch({ type: 'prev' }),
      goTo: (index: number) => dispatch({ type: 'goTo', index }),
      goToId: (id: string) => {
        const i = scenes.findIndex((s) => s.id === id);
        if (i >= 0) dispatch({ type: 'goTo', index: i });
      },
      goDeeper: () => dispatch({ type: 'deeper' }),
      surface: () => dispatch({ type: 'surface' }),
      openIndex: () => dispatch({ type: 'openIndex' }),
      closeIndex: () => dispatch({ type: 'closeIndex' }),
      skipCard: () => dispatch({ type: 'cardDone' }),
    }),
    [],
  );

  const canGoDeeper = !state.deeper && !!top.deeper;
  return { state, scene, top, chapter, numbering, canGoDeeper, ...actions };
}

export type Sequence = ReturnType<typeof useSequence>;
