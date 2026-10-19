'use client';

// The owner's two forms that pick a stay: adding a booking taken by phone, on LINE or as a walk-in, and
// changing or cancelling a confirmed one. They keep what was typed when the house says no (a full night, a
// missing name), so the owner fixes one field instead of starting over.
import { startTransition, useActionState, useState } from 'react';
import { booking as bookingCopy, rooms } from '@/content/site';
import type { Booking, RoomId } from '@/lib/booking/model';
import DatePicker from '@/components/DatePicker';
import { addBooking, cancelStay, changeStay, type FormState } from '@/app/owner/actions';

type StayValues = { roomId: RoomId; checkIn: string; nights: number };

// which room, which night, how many nights; the date picker writes into a hidden field so the form posts it
function StayFields({ id, start, today }: { id: string; start: StayValues; today: string }) {
  const [checkIn, setCheckIn] = useState(start.checkIn);
  return (
    <>
      <fieldset className="stay-room">
        <legend>Room</legend>
        {rooms.map((r) => (
          <label key={r.id}>
            <input type="radio" name="roomId" value={r.id} defaultChecked={r.id === start.roomId} required />
            {r.name}
          </label>
        ))}
      </fieldset>
      <div className="stay-when">
        <div className="field">
          <label htmlFor={`${id}-in`}>Arriving</label>
          <DatePicker id={`${id}-in`} label="Arriving" min={today} value={checkIn} onChange={setCheckIn} />
          <input type="hidden" name="checkIn" value={checkIn} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-nights`}>Nights</label>
          <input id={`${id}-nights`} name="nights" type="number" inputMode="numeric" min={1} max={bookingCopy.maxNights} defaultValue={start.nights} required />
        </div>
      </div>
    </>
  );
}

function MailBox({ label }: { label: string }) {
  return (
    <label className="stay-mail">
      <input type="checkbox" name="mail" defaultChecked />
      {label}
    </label>
  );
}

const Problem = ({ state }: { state: FormState }) => (state ? <p className="msg bad" role="alert">{state.error}</p> : null);

// React clears a form once its action has run, which would throw away what the owner typed whenever the
// house says no, so these forms hand their fields to the action themselves
const submitTo = (act: (form: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  startTransition(() => act(form));
};

export function AddBooking({ today }: { today: string }) {
  const [state, act, pending] = useActionState(addBooking, null);
  return (
    <details className="owner-add" open={state !== null}>
      <summary>Add a booking taken by phone, on LINE or as a walk-in</summary>
      <form onSubmit={submitTo(act)} className="stay-form">
        <StayFields id="add" start={{ roomId: rooms[0].id, checkIn: today, nights: bookingCopy.defaultNights }} today={today} />
        <div className="stay-guest">
          <div className="field">
            <label htmlFor="add-name">Guest&rsquo;s name</label>
            <input id="add-name" name="name" required minLength={2} maxLength={80} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="add-email">Email <small>if they gave one</small></label>
            <input id="add-email" name="email" type="email" maxLength={120} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="add-contact">LINE or phone</label>
            <input id="add-contact" name="contact" maxLength={60} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="add-note">Note</label>
            <input id="add-note" name="note" maxLength={500} autoComplete="off" />
          </div>
        </div>
        <MailBox label="Email the guest a confirmation, if there is an address" />
        <Problem state={state} />
        <button className="btn" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Add and confirm'}</button>
      </form>
    </details>
  );
}

export function ChangeStay({ b, today }: { b: Booking; today: string }) {
  const [state, act, pending] = useActionState(changeStay, null);
  const canMail = b.guest.email !== '';
  return (
    <details className="decline stay-change" open={state !== null}>
      <summary>Change or cancel</summary>
      <form onSubmit={submitTo(act)} className="stay-form">
        <input type="hidden" name="ref" value={b.ref} />
        <input type="hidden" name="was" value={b.checkIn} />
        <StayFields id={`move-${b.ref}`} start={b} today={today < b.checkIn ? today : b.checkIn} />
        {canMail ? <MailBox label="Email the guest the new dates" /> : <p className="stay-nomail">No email on file; tell the guest yourself.</p>}
        <Problem state={state} />
        <button className="btn" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save the change'}</button>
      </form>
      <details className="stay-cancel">
        <summary>Cancel this stay</summary>
        <form action={cancelStay} className="stay-form">
          <input type="hidden" name="ref" value={b.ref} />
          <p>The room is freed for other guests. This cannot be undone; a new booking would be needed.</p>
          {canMail && <MailBox label="Email the guest that it is cancelled" />}
          <button className="btn" type="submit">Cancel {b.ref}</button>
        </form>
      </details>
    </details>
  );
}
