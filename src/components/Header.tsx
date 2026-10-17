import { evening, hotel } from '@/content/site';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Header() {
  return (
    <header className="top wrap" id="top">
      <div className="brand">
        <a className="wm" href="#home">{hotel.name}</a>
        <span className="clock" id="clock" aria-hidden="true">
          <i />
          <span>
            คืนนี้ <b id="clock-t">{pad(evening.startHour)}:00</b>
          </span>
        </span>
      </div>
      <nav aria-label="หลัก">
        <a className="opt-link" href="#rooms">ห้องพัก</a>
        <a className="opt-link" href="#tea">โถงชั้นล่าง</a>
        <a className="opt-link" href="#walk">รอบบ้าน</a>
        <a className="btn" href="#book">จองห้อง</a>
      </nav>
    </header>
  );
}
