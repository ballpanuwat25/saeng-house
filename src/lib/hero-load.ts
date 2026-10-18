// Load state of the hero photo, shared by the hero (which downloads it), the lantern loader (which
// shows it) and page-wide motion (which waits for it).
//   loading: the photo is downloading; lanterns light up with its progress
//   lit:     the photo is ready; the loader finishes lighting every lantern
//   opening: every lantern is lit and the loader fades into the page
//   done:    the loader is gone
import { useSyncExternalStore } from 'react';

export type HeroPhase = 'loading' | 'lit' | 'opening' | 'done';
export type HeroLoad = { phase: HeroPhase; progress: number };

let state: HeroLoad = { phase: 'loading', progress: 0 };
const listeners = new Set<() => void>();
const set = (next: Partial<HeroLoad>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export const setHeroProgress = (progress: number) => state.phase === 'loading' && set({ progress });
export const heroPhotoReady = () => state.phase === 'loading' && set({ phase: 'lit', progress: 1 });
export const openHero = () => state.phase === 'lit' && set({ phase: 'opening' });
export const finishHero = () => set({ phase: 'done' });

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: HeroLoad = { phase: 'loading', progress: 0 };
export const useHeroLoad = () => useSyncExternalStore(subscribe, () => state, () => SERVER);

const isOpen = () => state.phase === 'opening' || state.phase === 'done';

// runs cb once, when the loader starts fading into the page (at once if it already has)
export function onHeroReady(cb: () => void): () => void {
  if (isOpen()) {
    cb();
    return () => {};
  }
  let fired = false;
  return subscribe(() => {
    if (fired || !isOpen()) return;
    fired = true;
    cb();
  });
}
