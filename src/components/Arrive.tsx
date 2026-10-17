import { facts, hotel } from '@/content/site';

export default function Arrive() {
  return (
    <section className="arrive wrap" aria-label="มาถึง">
      <p className="say">
        เดินผ่านประตูบานเฟี้ยมเข้ามา ทางเดินโคมแดงพาไปถึงบันไดไม้ ตึกหลังนี้สร้างปี 2465 เคยเป็นโกดังเครื่องเทศ วันนี้มีห้องพักเพียง {hotel.rooms} ห้อง
      </p>
      <dl className="facts">
        {facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
