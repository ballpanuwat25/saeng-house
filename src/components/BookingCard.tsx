'use client';

import { useEffect, useState } from 'react';
import { booking, hotel, rooms, type Room } from '@/content/site';

// fired by "Book this room" in the rooms section so the ticket arrives with that room chosen
export const CHOOSE_ROOM = 'saeng:choose-room';

type Request = { checkIn: string; nights: number; roomId: Room['id'] };

const DAY = 864e5;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const shortDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const baht = (n: number) => '฿' + n.toLocaleString('en-US');

// A booking ticket in the manner of an old Chinatown shop slip: the request above the perforation,
// the stub with the total below it, and the house seal stamped on once it is sent.
export default function BookingCard() {
  const [today, setToday] = useState('');
  const [serial, setSerial] = useState('');
  const [req, setReq] = useState<Request>({ checkIn: '', nights: booking.defaultNights, roomId: rooms[0].id });
  const [sent, setSent] = useState(false);

  // dates depend on the visitor's clock, so they are set after mount to keep server and client markup equal
  useEffect(() => {
    const now = new Date();
    setToday(isoDate(now));
    setSerial(String(Math.floor((now.getTime() / DAY) % 10000)).padStart(4, '0'));
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
  const span = from ? `${shortDate(from)} to ${shortDate(new Date(from.getTime() + req.nights * DAY))}` : '';

  return (
    <form
      className="ticket"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="ticket-main">
        <div className="ticket-head">
          <span>{hotel.name}</span>
          <span>No. {serial}</span>
        </div>
        <div className="pair">
          <div className="field">
            <label htmlFor="checkin">Arriving</label>
            <input type="date" id="checkin" min={today} value={req.checkIn} onChange={(e) => update({ checkIn: e.target.value })} />
          </div>
          <div className="field">
            <span className="lbl" id="n-lbl">Nights</span>
            <div className="step" role="group" aria-labelledby="n-lbl">
              <button type="button" aria-label="One night fewer" onClick={() => update({ nights: Math.max(1, req.nights - 1) })}>−</button>
              <output>{req.nights}</output>
              <button type="button" aria-label="One night more" onClick={() => update({ nights: Math.min(booking.maxNights, req.nights + 1) })}>+</button>
            </div>
          </div>
        </div>
        <div className="field">
          <span className="lbl">Room</span>
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
      </div>
      <div className="ticket-stub">
        <div className="total">
          <span>{span}</span>
          <b>{baht(total)}</b>
        </div>
        <button className="btn" type="submit">{booking.action}</button>
        <p className="msg" aria-live="polite">{sent ? booking.sent : ''}</p>
        {sent && (
          <svg className="seal" viewBox="0 0 100 100" aria-hidden="true">
            <rect x="4" y="4" width="92" height="92" rx="6" className="seal-ink" />
            <rect x="11" y="11" width="78" height="78" rx="3" className="seal-line" />
            <text x="50" y="62" textAnchor="middle" className="seal-word">{hotel.wordmark}</text>
          </svg>
        )}
      </div>
    </form>
  );
}
