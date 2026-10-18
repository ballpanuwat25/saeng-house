import { evening, hotel } from '@/content/site';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Header() {
  return (
    <header className="top wrap" id="top">
      <div className="brand">
        <a className="wm" href="#home" aria-label={hotel.name}>{hotel.wordmark}</a>
        <span className="clock" id="clock" aria-hidden="true">
          <i />
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
