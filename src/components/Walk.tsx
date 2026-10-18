'use client';

import { useState } from 'react';
import { walk } from '@/content/site';
import { talatNoiMap as map } from '@/content/talat-noi-map';
import Rich from '@/components/Rich';

const spotOf = (name: string) => map.places[name as keyof typeof map.places];

// Talat Noi drawn from OpenStreetMap. Pointing at a place in the list draws the walk from the
// hotel door to it along the real streets.
export default function Walk() {
  const [active, setActive] = useState(0);
  const place = walk.places[active];
  const spot = spotOf(place.name);
  const [hx, hy] = map.hotel;

  return (
    <section className="walk wrap" id="walk" aria-labelledby="walk-h">
      <figure className="map" aria-label={`Map: ${spot.minutes} minutes on foot to ${place.name}`}>
        <svg viewBox={`0 0 ${map.width} ${map.height}`} role="img" aria-hidden="true">
          <path d={map.river} className="river" />
          <text className="river-name" x="58" y="300" transform="rotate(-78 58 300)">Chao Phraya</text>
          <path d={map.roads.lane} className="road lane" />
          <path d={map.roads.street} className="road street" />
          <path d={map.roads.major} className="road major" />
          {map.labels.map((l) => (
            <g key={l.id}>
              <path id={l.id} d={l.d} fill="none" />
              <text className="road-name" dy="3.5">
                <textPath href={`#${l.id}`} startOffset={l.at} textAnchor="middle">{l.text}</textPath>
              </text>
            </g>
          ))}
          <path key={place.name} d={spot.route} pathLength={1} className="route" />
          {walk.places.map((p, i) => {
            const [x, y] = spotOf(p.name).at;
            return (
              <g key={p.name} className={`spot${i === active ? ' on' : ''}`}>
                <circle cx={x} cy={y} r={i === active ? 9 : 6} />
              </g>
            );
          })}
          <text className="spot-name" x={spot.at[0] + 16} y={spot.at[1] + 5}>
            {place.name} · {spot.minutes} min
          </text>
          <g className="home" transform={`translate(${hx - 14} ${hy - 26})`}>
            <rect x="13" y="0" width="2" height="6" />
            <rect x="7" y="6" width="14" height="4" rx="1.5" className="cap" />
            <ellipse cx="14" cy="19" rx="11" ry="10" className="paper" />
            <rect x="7" y="28" width="14" height="4" rx="1.5" className="cap" />
          </g>
          <text className="home-name" x={hx + 18} y={hy + 2}>Saeng House</text>
        </svg>
        <figcaption className="map-credit">© OpenStreetMap contributors</figcaption>
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
                <span>{spotOf(p.name).minutes} min</span>
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
