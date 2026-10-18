import { arrival, facts, type Fact } from '@/content/site';

// how far down the drawing (0 to 100) each part of the front sits, so its fact is written level with it
const PART_Y: Record<Fact['part'], number> = { gable: 15, rooms: 42, door: 80, street: 0 };
const FLOORS = [92, 152, 212];
const BAYS = [26, 78, 130, 182];

function Note({ f }: { f: Fact }) {
  return (
    <div className="fact" style={{ top: `${PART_Y[f.part]}%` }}>
      <dt>
        {f.figure}
        {f.unit && <small>{f.unit}</small>}
      </dt>
      <dd>{f.label}</dd>
    </div>
  );
}

// The facts are written beside a drawing of the warehouse front: the year on the gable, as Talat Noi
// shophouses carry it, a lit window for each room, the folding doors, and the street to the pier.
export default function Arrive() {
  const year = facts.find((f) => f.part === 'gable')?.figure;
  return (
    <section className="arrive wrap" aria-label="Arriving">
      <p className="say">{arrival}</p>
      <div className="front">
        <svg className="facade" viewBox="0 0 240 340" aria-hidden="true">
          <path className="wall" d="M12 72 H228 V340 H12 Z M28 72 V52 Q28 40 44 40 H92 Q120 4 148 40 H196 Q212 40 212 52 V72 Z" />
          {year && <text className="year" x="120" y="62" textAnchor="middle">{year}</text>}
          <path className="trim" d="M6 72 H234 M8 80 H232 M8 272 H232" />
          {FLOORS.flatMap((y) =>
            BAYS.map((x) => <path key={`${x}-${y}`} className="win" d={`M${x} ${y + 44} V${y + 12} Q${x + 16} ${y - 2} ${x + 32} ${y + 12} V${y + 44} Z`} />),
          )}
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} className="slat" x={23 + i * 24.6} y="284" width="20" height="56" rx="1" />
          ))}
          <g className="lamp">
            <rect x="118.5" y="272" width="3" height="9" />
            <ellipse cx="120" cy="290" rx="9" ry="8" />
          </g>
        </svg>
        <dl className="ledger">
          {facts.filter((f) => f.part !== 'street').map((f) => (
            <Note key={f.part} f={f} />
          ))}
        </dl>
        <dl className="road">
          {facts.filter((f) => f.part === 'street').map((f) => (
            <Note key={f.part} f={f} />
          ))}
        </dl>
      </div>
    </section>
  );
}
