// Load state of the hero photo, shared by the hero (which downloads it), the lantern loader (which
// shows it) and page-wide motion (which waits for it).
//   loading: the loader covers the page while the photo downloads
//   opening: the photo is on screen and the loader's light is opening outward
//   done:    the loader is gone
import { useSyncExternalStore } from 'react';

export type HeroPhase = 'loading' | 'opening' | 'done';
export type HeroLoad = { phase: HeroPhase; progress: number };

let state: HeroLoad = { phase: 'loading', progress: 0 };
const listeners = new Set<() => void>();
const set = (next: Partial<HeroLoad>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export const setHeroProgress = (progress: number) => set({ progress });
export const openHero = () => state.phase === 'loading' && set({ phase: 'opening', progress: 1 });
export const finishHero = () => set({ phase: 'done' });

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: HeroLoad = { phase: 'loading', progress: 0 };
export const useHeroLoad = () => useSyncExternalStore(subscribe, () => state, () => SERVER);

// runs cb once the loader starts opening (at once if it already has)
export function onHeroReady(cb: () => void): () => void {
  if (state.phase !== 'loading') {
    cb();
    return () => {};
  }
  let fired = false;
  return subscribe(() => {
    if (fired || state.phase === 'loading') return;
    fired = true;
    cb();
  });
}
