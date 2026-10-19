'use client';

import { useEffect, useRef, useState } from 'react';
import { booking, hotel, rooms, type Room } from '@/content/site';
import DatePicker from '@/components/DatePicker';
import { addDays, bangkokToday, checkOutOf, dayMonth, type Availability } from '@/lib/booking/model';

// fired by "Book this room" in the rooms section so the ticket arrives with that room chosen
export const CHOOSE_ROOM = 'saeng:choose-room';

type Stay = { checkIn: string; nights: number; roomId: Room['id'] };
type Guest = { name: string; email: string; contact: string; note: string };
// the ticket's two sides and what happens once it is sent
type Step =
  | { side: 'stay' }
  | { side: 'guest' }
  | { side: 'guest'; sending: true }
  | { side: 'done'; ref: string; email: string; mails?: { guest: string; owner: string } }
  | { side: 'done'; demo: true };
// what the house says about the chosen nights: unknown while asking, or no store behind the site at all
type Rooms = { live: false } | { live: true; rooms: Availability } | null;

const DAY = 864e5;
const baht = (n: number) => '฿' + n.toLocaleString('en-US');

// A booking ticket in the manner of an old Chinatown shop slip: the stay above the perforation, then who
// is coming, the stub with the total below it, and the house seal stamped on once the request is in.
export default function BookingCard() {
  const [today, setToday] = useState('');
  const [serial, setSerial] = useState('');
  const [stay, setStay] = useState<Stay>({ checkIn: '', nights: booking.defaultNights, roomId: rooms[0].id });
  const [guest, setGuest] = useState<Guest>({ name: '', email: '', contact: '', note: '' });
  const [step, setStep] = useState<Step>({ side: 'stay' });
  const [houseSays, setHouseSays] = useState<Rooms>(null);
  const [problem, setProblem] = useState('');
  // bumped to ask the house again for the same nights, after a request changes what is free
  const [asked, askAgain] = useState(0);
  const nameField = useRef<HTMLInputElement>(null);

  // dates depend on the visitor's clock, so they are set after mount to keep server and client markup equal
  useEffect(() => {
    const now = new Date();
    // the house's own today, which the server checks against, not the visitor's or UTC's
    const houseToday = bangkokToday();
    setToday(houseToday);
    setSerial(String(Math.floor((now.getTime() / DAY) % 10000)).padStart(4, '0'));
    setStay((s) => ({ ...s, checkIn: addDays(houseToday, booking.daysAhead) }));
    const onChoose = (e: Event) => {
      setStay((s) => ({ ...s, roomId: (e as CustomEvent<Room['id']>).detail }));
      setStep({ side: 'stay' });
    };
    addEventListener(CHOOSE_ROOM, onChoose);
    return () => removeEventListener(CHOOSE_ROOM, onChoose);
  }, []);

  // ask the house which rooms are free whenever the dates change; a newer question cancels an older one
  useEffect(() => {
    if (!stay.checkIn) return;
    const ask = new AbortController();
    const wait = setTimeout(() => {
      fetch(`/api/availability?checkIn=${stay.checkIn}&nights=${stay.nights}`, { signal: ask.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setHouseSays(data.live ? { live: true, rooms: data.rooms } : { live: false }))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(wait);
      ask.abort();
    };
  }, [stay.checkIn, stay.nights, asked]);

  // the side being turned away is hidden but stays on the page, so the focus follows onto the side now up
  useEffect(() => {
    if (step.side === 'guest' && !('sending' in step)) nameField.current?.focus();
    else if (step.side === 'stay' && document.activeElement?.closest('.who')) document.getElementById('checkin')?.focus();
  }, [step]);

  const changeStay = (patch: Partial<Stay>) => {
    setStay((s) => ({ ...s, ...patch }));
    setStep({ side: 'stay' });
    setProblem('');
  };

  const room = rooms.find((r) => r.id === stay.roomId)!;
  const total = room.pricePerNight * stay.nights;
  const span = stay.checkIn ? `${dayMonth(stay.checkIn)} to ${dayMonth(checkOutOf(stay.checkIn, stay.nights))}` : '';
  const free = houseSays?.live ? houseSays.rooms : null;
  const chosenIsFull = free ? free[stay.roomId].left === 0 : false;
  const sending = step.side === 'guest' && 'sending' in step;

  const send = async () => {
    setStep({ side: 'guest', sending: true });
    setProblem('');
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...stay, guest: { name: guest.name, email: guest.email, contact: guest.contact }, note: guest.note, website: (document.getElementById('bk-website') as HTMLInputElement | null)?.value }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (data?.ok && data.demo) return setStep({ side: 'done', demo: true });
    if (data?.ok) {
      askAgain((n) => n + 1);
      return setStep({ side: 'done', ref: data.ref, email: data.email, mails: data.mails });
    }
    if (res?.status === 409) {
      // someone took the last room while this guest was typing: back to the stay, with fresh numbers
      askAgain((n) => n + 1);
      setStep({ side: 'stay' });
      return setProblem(`${room.name} is now full on ${data.fullOn.map(dayMonth).join(', ')}.`);
    }
    setStep({ side: 'guest' });
    setProblem(data?.error ?? booking.failed);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // another request starts over from the stay, with the guest's details kept
    if (step.side === 'done') return setStep({ side: 'stay' });
    if (step.side === 'stay') {
      if (chosenIsFull) return;
      // with no store behind the site, the ticket is a demo: it stamps without asking who is coming
      if (houseSays && !houseSays.live) return setStep({ side: 'done', demo: true });
      return setStep({ side: 'guest' });
    }
    if (step.side === 'guest' && !sending) void send();
  };

  // in the public demo no email goes out, so the ticket offers both to read instead
  const message =
    step.side !== 'done' ? problem
    : 'demo' in step ? booking.demo
    : step.mails ? (
      <>
        {booking.demoSent(step.ref)}{' '}
        <a href={step.mails.guest} target="_blank" rel="noopener">yours</a> and{' '}
        <a href={step.mails.owner} target="_blank" rel="noopener">the owner&rsquo;s</a>.
      </>
    )
    : booking.sent(step.ref, step.email);
  const action =
    step.side === 'done' ? booking.again : step.side === 'stay' ? (chosenIsFull ? booking.fullAction : booking.action) : sending ? booking.sending : booking.details.send;

  return (
    <form className="ticket" noValidate onSubmit={onSubmit}>
      <div className="ticket-main">
        <div className="ticket-head">
          <span>{hotel.name}</span>
          <span>No. {step.side === 'done' && 'ref' in step ? step.ref : serial}</span>
        </div>

        {/* both sides of the ticket always sit in the same space, the one not in use hidden, so turning the
            ticket over never changes its height and the section and its photo behind it stay still */}
        <div className="ticket-sides">
          <div className="ticket-side" inert={step.side === 'guest'}>
            <div className="pair">
              <div className="field">
                <label htmlFor="checkin">Arriving</label>
                <DatePicker id="checkin" label="Arriving" min={today} today={today} value={stay.checkIn} onChange={(checkIn) => changeStay({ checkIn })} />
              </div>
              <div className="field">
                <span className="lbl" id="n-lbl">Nights</span>
                <div className="step" role="group" aria-labelledby="n-lbl">
                  <button type="button" aria-label="One night fewer" onClick={() => changeStay({ nights: Math.max(1, stay.nights - 1) })}>−</button>
                  <output>{stay.nights}</output>
                  <button type="button" aria-label="One night more" onClick={() => changeStay({ nights: Math.min(booking.maxNights, stay.nights + 1) })}>+</button>
                </div>
              </div>
            </div>
            <div className="field">
              <span className="lbl">Room</span>
              <div className="opts" role="radiogroup">
                {rooms.map((r) => {
                  const left = free?.[r.id].left;
                  return (
                    <label className={`opt${left === 0 ? ' full' : ''}`} key={r.id}>
                      <input type="radio" name="room" value={r.id} checked={r.id === stay.roomId} onChange={() => changeStay({ roomId: r.id })} />
                      <span>{r.name}</span>
                      <span>
                        {left !== undefined && <em>{left === 0 ? booking.full : booking.left(left)}</em>}
                        {baht(r.pricePerNight)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <fieldset className="who ticket-side" disabled={sending} inert={step.side !== 'guest'}>
            <legend className="who-title">{booking.details.title}</legend>
            <p className="who-stay">
              {room.name} · {span}
              <button type="button" className="who-back" onClick={() => setStep({ side: 'stay' })}>{booking.details.back}</button>
            </p>
            <div className="pair">
              <div className="field">
                <label htmlFor="bk-name">{booking.details.name}</label>
                <input ref={nameField} id="bk-name" autoComplete="name" required value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="bk-email">{booking.details.email}</label>
                <input id="bk-email" type="email" autoComplete="email" inputMode="email" required value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
              </div>
            </div>
            <div className="pair">
              <div className="field">
                <label htmlFor="bk-contact">
                  {booking.details.contact} <small>{booking.details.contactHint}</small>
                </label>
                <input id="bk-contact" autoComplete="tel" value={guest.contact} onChange={(e) => setGuest({ ...guest, contact: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="bk-note">{booking.details.note}</label>
                <input id="bk-note" value={guest.note} onChange={(e) => setGuest({ ...guest, note: e.target.value })} />
              </div>
            </div>
            <input id="bk-website" name="website" className="trap" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          </fieldset>
        </div>
      </div>
      <div className="ticket-stub">
        <div className="total">
          <span>{span}</span>
          <b>{baht(total)}</b>
        </div>
        <button className="btn" type="submit" disabled={chosenIsFull && step.side === 'stay'} aria-disabled={sending}>
          {action}
        </button>
        <p className={`msg${problem && step.side !== 'done' ? ' bad' : ''}`} aria-live="polite">
          {/* one span, so the demo's sentence and its links flow as one line in the flex row */}
          <span>{message}</span>
        </p>
        {step.side === 'done' && (
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
