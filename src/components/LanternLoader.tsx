'use client';

import { useEffect, useState } from 'react';
import { hotel } from '@/content/site';
import { finishHero, useHeroLoad } from '@/lib/hero-load';

// One paper lantern on a dark screen, rendered in the server HTML so it is the very first thing
// a visitor sees. Its light follows the real download of the hero photo; when the photo is ready
// the light opens outward and reveals the page.
const REVEAL_MS = 1200;

export default function LanternLoader() {
  const { phase, progress } = useHeroLoad();
  const [shown, setShown] = useState(0);

  // ease the displayed value toward the real one so the light rises smoothly between network chunks
  useEffect(() => {
    let raf = 0;
    const step = () => {
      setShown((s) => (Math.abs(progress - s) < 0.002 ? progress : s + (progress - s) * 0.12));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  useEffect(() => {
    if (phase !== 'opening') return;
    document.documentElement.classList.remove('is-loading');
    const id = setTimeout(finishHero, matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : REVEAL_MS);
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === 'done') return null;
  const lit = 0.15 + 0.85 * shown;
  return (
    <div className={`loader${phase === 'opening' ? ' open' : ''}`} style={{ '--lit': lit } as React.CSSProperties} role="status" aria-live="polite">
      <div className="loader-lamp">
        <div className="loader-halo" />
        <svg className="loader-lantern" viewBox="0 0 120 200" aria-hidden="true">
          <defs>
            <radialGradient id="paper" cx="50%" cy="48%" r="60%">
              <stop offset="0" stopColor="#ffd9a8" />
              <stop offset=".45" stopColor="#e2452f" />
              <stop offset="1" stopColor="#5a0c12" />
            </radialGradient>
          </defs>
          <rect x="59" y="0" width="2" height="30" fill="#3a2a24" />
          <rect x="42" y="28" width="36" height="9" rx="3" fill="#8a6420" />
          <ellipse cx="60" cy="86" rx="47" ry="51" fill="#4a0a10" />
          <ellipse className="loader-paper" cx="60" cy="86" rx="47" ry="51" fill="url(#paper)" />
          <g fill="none" stroke="#3a0608" strokeOpacity=".35" strokeWidth="1.4">
            <ellipse cx="60" cy="86" rx="35" ry="51" />
            <ellipse cx="60" cy="86" rx="21" ry="51" />
            <ellipse cx="60" cy="86" rx="7" ry="51" />
          </g>
          <rect x="42" y="134" width="36" height="9" rx="3" fill="#8a6420" />
          <rect x="56" y="143" width="8" height="6" rx="2" fill="#8a6420" />
          <rect x="57.5" y="149" width="5" height="40" rx="2" fill="#b3121f" />
        </svg>
      </div>
      <p className="loader-name">{hotel.name}</p>
      <p className="loader-note">
        กำลังจุดโคม <span>{Math.round(shown * 100)}%</span>
      </p>
    </div>
  );
}
