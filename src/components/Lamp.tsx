'use client';

import { useEffect, useRef } from 'react';

// The oxblood lamp that follows the pointer over the dark ground (.glow in globals.css). On the home page
// it waits below the hero (`below` names the hero's id); on the 404 page it is on from the start.
export default function Lamp({ below }: { below?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = ref.current!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const over = below ? document.getElementById(below) : null;
    const lamp = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, moved: 0 };
    const onPointer = (e: PointerEvent) => {
      lamp.tx = e.clientX;
      lamp.ty = e.clientY;
      lamp.moved = performance.now();
    };
    addEventListener('pointermove', onPointer, { passive: true });
    let raf = 0;
    const tick = (now: number) => {
      const show = !over || over.getBoundingClientRect().bottom < innerHeight * 0.5;
      glow.classList.toggle('on', show);
      if (show) {
        // with no mouse at all (a touch screen) the lamp drifts on its own; once a pointer has moved it
        // stays where the pointer is, even while the pointer rests
        if (!lamp.moved && !reduce) {
          const t = now / 1000;
          lamp.tx = innerWidth * (0.5 + 0.32 * Math.sin(t * 0.23));
          lamp.ty = innerHeight * (0.5 + 0.25 * Math.sin(t * 0.31 + 1));
        }
        const k = reduce ? 1 : 0.08;
        lamp.x += (lamp.tx - lamp.x) * k;
        lamp.y += (lamp.ty - lamp.y) * k;
        glow.style.setProperty('--gx', `${lamp.x}px`);
        glow.style.setProperty('--gy', `${lamp.y}px`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      removeEventListener('pointermove', onPointer);
      cancelAnimationFrame(raf);
    };
  }, [below]);

  return <div className="glow" ref={ref} aria-hidden="true" />;
}
