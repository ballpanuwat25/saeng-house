import { evening, hotel } from '@/content/site';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Header() {
  return (
    <header className="top wrap" id="top">
      <div className="brand">
        <a className="wm" href="#home" aria-label={hotel.name}>{hotel.wordmark}</a>
        <span className="clock" id="clock" aria-hidden="true">
          {/* the same lantern that marks the house on the map; it burns brighter as the evening goes on */}
          <svg className="clock-lamp" viewBox="0 0 28 32">
            <rect x="13" y="0" width="2" height="6" />
            <rect x="7" y="6" width="14" height="4" rx="1.5" className="cap" />
            <ellipse cx="14" cy="19" rx="11" ry="10" className="paper" />
            <rect x="7" y="28" width="14" height="4" rx="1.5" className="cap" />
          </svg>
          <span>
            Tonight <b id="clock-t">{pad(evening.startHour)}:00</b>
          </span>
        </span>
      </div>
      <nav aria-label="Main">
        <a className="opt-link" href="#rooms">Rooms</a>
        <a className="opt-link" href="#tea">The hall</a>
        <a className="opt-link" href="#walk">Around</a>
        <a className="btn" href="#book">Book a room</a>
      </nav>
    </header>
  );
}
