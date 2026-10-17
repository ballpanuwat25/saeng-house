import { credits, hotel } from '@/content/site';

export default function Footer() {
  return (
    <footer className="foot wrap">
      <p className="mark-big" aria-hidden="true">{hotel.name}</p>
      <div className="cols">
        <p>
          <strong>{hotel.fullName}</strong>
          {hotel.address[0]}
          <br />
          {hotel.address[1]}
        </p>
        <p>
          <strong>ติดต่อ</strong>
          {hotel.phone}
          <br />
          LINE {hotel.line}
        </p>
        <p>
          <strong>23:00</strong>
          โคมในทางเดินหรี่ลง เหลือดวงหน้าห้องคุณ
          <br />
          <a className="link" href="#home">กลับขึ้นบน</a>
        </p>
      </div>
      <p className="credits">{credits}</p>
    </footer>
  );
}
