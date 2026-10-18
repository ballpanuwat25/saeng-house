'use client';

import { useState } from 'react';
import { walk, type MapPoint } from '@/content/site';
import Rich from '@/components/Rich';

// A hand-drawn plan of Talat Noi, not to scale. Pointing at a place in the list draws the walk
// from the hotel door to it.
const ROADS = [
  { d: 'M600 30 C 520 190 430 360 392 720', label: 'Charoen Krung Rd', at: [478, 300], angle: -64 },
  { d: 'M170 132 C 232 214 300 236 446 178', label: 'Song Wat Rd', at: [262, 246], angle: 14 },
  { d: 'M352 18 C 420 78 500 108 600 122', label: 'Yaowarat Rd', at: [520, 92], angle: 9 },
  { d: 'M150 432 C 228 422 300 406 402 396', label: 'Soi Wanit 2', at: [214, 448], angle: -6 },
  { d: 'M186 304 C 260 312 330 326 398 336' },
  { d: 'M164 566 C 250 580 320 596 388 604' },
] as const;
const RIVER = 'M0 0 H160 C 136 128 112 250 142 360 C 172 470 124 596 156 720 H0 Z';

// a gentle bow from the door to the place, so the route reads as a walk rather than a ruler line
function route([x1, y1]: MapPoint, [x2, y2]: MapPoint) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const nx = -(y2 - y1) * 0.18, ny = (x2 - x1) * 0.18;
  return `M${x1} ${y1} Q ${mx + nx} ${my + ny} ${x2} ${y2}`;
}

export default function Walk() {
  const [active, setActive] = useState(0);
  const place = walk.places[active];
  const [hx, hy] = walk.hotelAt;

  return (
    <section className="walk wrap" id="walk" aria-labelledby="walk-h">
      <figure className="map" aria-label={`Map: ${place.walkMinutes} minutes on foot to ${place.name}`}>
        <svg viewBox="0 0 600 720" role="img" aria-hidden="true">
          <path d={RIVER} className="river" />
          <text className="river-name" x="64" y="420" transform="rotate(-90 64 420)">Chao Phraya</text>
          {ROADS.map((r) => (
            <path key={r.d} d={r.d} className="road" />
          ))}
          {ROADS.map((r) =>
            'label' in r ? (
              <text key={r.label} className="road-name" x={r.at[0]} y={r.at[1]} transform={`rotate(${r.angle} ${r.at[0]} ${r.at[1]})`}>
                {r.label}
              </text>
            ) : null,
          )}
          <path key={place.name} d={route(walk.hotelAt, place.at)} pathLength={1} className="route" />
          {walk.places.map((p, i) => (
            <g key={p.name} className={`spot${i === active ? ' on' : ''}`}>
              <circle cx={p.at[0]} cy={p.at[1]} r={i === active ? 9 : 6} />
            </g>
          ))}
          <text className="spot-name" x={place.at[0] + 16} y={place.at[1] + 5}>
            {place.name} · {place.walkMinutes} min
          </text>
          <g className="home" transform={`translate(${hx - 14} ${hy - 26})`}>
            <rect x="13" y="0" width="2" height="6" />
            <rect x="7" y="6" width="14" height="4" rx="1.5" className="cap" />
            <ellipse cx="14" cy="19" rx="11" ry="10" className="paper" />
            <rect x="7" y="28" width="14" height="4" rx="1.5" className="cap" />
          </g>
          <text className="home-name" x={hx + 18} y={hy + 2}>Saeng House</text>
        </svg>
      </figure>
      <div className="list">
        <h2 id="walk-h">
          <time>{walk.time}</time> <Rich text={walk.title} />
        </h2>
        <ol>
          {walk.places.map((p, i) => (
            <li key={p.name}>
              <button
                type="button"
                aria-pressed={i === active}
                onClick={() => setActive(i)}
                onFocus={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
              >
                <b>{p.name}</b>
                <span>{p.walkMinutes} min</span>
                <small>{p.note}</small>
              </button>
            </li>
          ))}
        </ol>
        <p className="note">{walk.note}</p>
      </div>
    </section>
  );
}
