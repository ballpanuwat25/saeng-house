'use client';

import { useEffect, useRef } from 'react';
import { hotel } from '@/content/site';
import { finishHero, openHero, useHeroLoad } from '@/lib/hero-load';

// A dark field of small paper lanterns. The unlit field is a CSS background pattern in the server
// HTML, so it shows on the first frame; a canvas lights the lanterns from the centre outward as the
// hero photo downloads. When every lantern is lit the field fades into the page.
const CELL_W = 56;
const CELL_H = 72;
const FADE_MS = 900;
const MIN_SWEEP_MS = 1400;
// how far past its threshold a lantern takes to reach full light, in progress units
const RAMP = 0.12;

function drawLit(g: CanvasRenderingContext2D, x: number, y: number, a: number) {
  const cx = x + 28, cy = y + 29;
  g.globalAlpha = a;
  const halo = g.createRadialGradient(cx, cy, 0, cx, cy, 34);
  halo.addColorStop(0, 'rgba(242, 110, 60, .38)');
  halo.addColorStop(1, 'rgba(196, 24, 43, 0)');
  g.fillStyle = halo;
  g.fillRect(cx - 34, cy - 34, 68, 68);
  const paper = g.createRadialGradient(cx, cy - 2, 1, cx, cy, 13);
  paper.addColorStop(0, '#ffe1b8');
  paper.addColorStop(0.5, '#e8472f');
  paper.addColorStop(1, '#7a1418');
  g.fillStyle = paper;
  g.beginPath();
  g.ellipse(cx, cy, 10, 12, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#c08a2c';
  g.fillRect(x + 22, y + 14, 12, 3);
  g.fillRect(x + 22, y + 41, 12, 3);
  g.fillStyle = '#d0262f';
  g.fillRect(x + 27, y + 44, 2, 10);
  g.globalAlpha = 1;
}

export default function LanternLoader() {
  const { phase, progress } = useHeroLoad();
  const canvas = useRef<HTMLCanvasElement>(null);
  const note = useRef<HTMLSpanElement>(null);
  const live = useRef({ phase, progress });
  live.current = { phase, progress };

  // one drawing loop for the loader's whole life; it reads the latest phase and progress from the ref
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const g = el.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let thresholds: Float32Array = new Float32Array(0), cols = 0, rows = 0;

    const layout = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      el.width = innerWidth * dpr;
      el.height = innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(innerWidth / CELL_W);
      rows = Math.ceil(innerHeight / CELL_H);
      // light spreads from the centre of the screen outward, with a little noise so it feels hand-lit
      const mx = innerWidth / 2, my = innerHeight / 2, far = Math.hypot(mx, my);
      thresholds = new Float32Array(cols * rows);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const d = Math.hypot(c * CELL_W + 28 - mx, r * CELL_H + 29 - my) / far;
          const noise = (Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
          thresholds[r * cols + c] = Math.min(1 - RAMP, d * 0.8 + Math.abs(noise) * 0.1);
        }
    };
    layout();
    addEventListener('resize', layout);

    let shown = 0, raf = 0;
    const born = performance.now();
    const frame = (now: number) => {
      const { phase: p, progress } = live.current;
      if (p === 'done') return;
      // never sweep faster than MIN_SWEEP_MS, so a fast connection still sees the lanterns light;
      // on a slow one the real progress is the limit and 100% arrives the moment the photo is ready
      const target = Math.min(progress, (now - born) / MIN_SWEEP_MS);
      shown += (target - shown) * 0.16;
      if (Math.abs(target - shown) < 0.002) shown = target;
      // the photo is ready and the last lantern is fully lit: fade into the page
      if (p === 'lit' && shown >= 1) openHero();
      if (note.current) note.current.textContent = `${Math.round(shown * 100)}%`;
      g.clearRect(0, 0, innerWidth, innerHeight);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const lit = Math.min(1, Math.max(0, (shown - thresholds[r * cols + c]) / RAMP));
          if (lit <= 0) continue;
          const flicker = reduce ? 1 : 0.9 + 0.1 * Math.sin(now / 420 + c * 1.7 + r * 2.3);
          drawLit(g, c * CELL_W, r * CELL_H, lit * flicker);
        }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', layout);
    };
  }, []);

  // the drawing loop opens the page once the last lantern is lit; this timer opens it anyway in case
  // animation frames are paused (background tab, power saving, some in-app browsers)
  useEffect(() => {
    if (phase !== 'lit') return;
    const id = setTimeout(openHero, MIN_SWEEP_MS + 600);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'opening') return;
    document.documentElement.classList.remove('is-loading');
    const id = setTimeout(finishHero, matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : FADE_MS);
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === 'done') return null;
  return (
    <div className={`loader${phase === 'opening' ? ' open' : ''}`} role="status" aria-live="polite">
      <canvas ref={canvas} aria-hidden="true" />
      <p className="loader-note">
        {hotel.name} <span ref={note}>0%</span>
      </p>
    </div>
  );
}
