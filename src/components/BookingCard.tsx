'use client';

import { useEffect, useState } from 'react';
import { booking, rooms, type Room } from '@/content/site';

// fired by "จองห้องนี้" in the rooms section so the card arrives with that room chosen
export const CHOOSE_ROOM = 'saeng:choose-room';

type Request = { checkIn: string; nights: number; roomId: Room['id'] };

const DAY = 864e5;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const thaiDate = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
const baht = (n: number) => '฿' + n.toLocaleString('en-US');

export default function BookingCard() {
  const [today, setToday] = useState<string>('');
  const [req, setReq] = useState<Request>({ checkIn: '', nights: booking.defaultNights, roomId: rooms[0].id });
  const [sent, setSent] = useState(false);

  // dates depend on the visitor's clock, so they are set after mount to keep server and client markup equal
  useEffect(() => {
    const now = new Date();
    setToday(isoDate(now));
    setReq((r) => ({ ...r, checkIn: isoDate(new Date(now.getTime() + booking.daysAhead * DAY)) }));
    const onChoose = (e: Event) => setReq((r) => ({ ...r, roomId: (e as CustomEvent<Room['id']>).detail }));
    addEventListener(CHOOSE_ROOM, onChoose);
    return () => removeEventListener(CHOOSE_ROOM, onChoose);
  }, []);

  const update = (patch: Partial<Request>) => {
    setReq((r) => ({ ...r, ...patch }));
    setSent(false);
  };

  const room = rooms.find((r) => r.id === req.roomId)!;
  const total = room.pricePerNight * req.nights;
  const from = req.checkIn ? new Date(req.checkIn) : null;
  const span = from ? `${thaiDate(from)} – ${thaiDate(new Date(from.getTime() + req.nights * DAY))}` : '—';

  return (
    <form
      className="card"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="pair">
        <div className="field">
          <label htmlFor="checkin">วันเข้าพัก</label>
          <input type="date" id="checkin" min={today} value={req.checkIn} onChange={(e) => update({ checkIn: e.target.value })} />
        </div>
        <div className="field">
          <span className="lbl" id="n-lbl">จำนวนคืน</span>
          <div className="step" role="group" aria-labelledby="n-lbl">
            <button type="button" aria-label="ลดจำนวนคืน" onClick={() => update({ nights: Math.max(1, req.nights - 1) })}>−</button>
            <output>{req.nights} คืน</output>
            <button type="button" aria-label="เพิ่มจำนวนคืน" onClick={() => update({ nights: Math.min(booking.maxNights, req.nights + 1) })}>+</button>
          </div>
        </div>
      </div>
      <div className="field">
        <span className="lbl">ห้อง</span>
        <div className="opts" role="radiogroup">
          {rooms.map((r) => (
            <label className="opt" key={r.id}>
              <input type="radio" name="room" value={r.id} checked={r.id === req.roomId} onChange={() => update({ roomId: r.id })} />
              <span>{r.name}</span>
              <span>{baht(r.pricePerNight)}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="total">
        <span>{span}</span>
        <b>{baht(total)}</b>
      </div>
      <button className="btn" type="submit">ส่งคำขอจอง</button>
      <p className="msg" aria-live="polite">
        {sent ? `รับคำขอแล้ว: ${room.name} ${span} รวม ${baht(total)} (ตัวอย่าง ยังไม่ได้ส่งจริง)` : ''}
      </p>
    </form>
  );
}
