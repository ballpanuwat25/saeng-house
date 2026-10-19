// What the tabs of the request book share: the header with its tabs, and one entry on the sheet.
import Link from 'next/link';
import { hotel } from '@/content/site';
import { checkOutOf, roomOf, weekDay, type Booking, type DeclineReason } from '@/lib/booking/model';
import { late, waitingNow } from '@/lib/owner/waiting';
import { confirmBooking, declineBooking, logout } from '@/app/owner/actions';
import { ChangeStay } from '@/app/owner/StayForms';
import BookTabs from '@/app/owner/BookTabs';
import Busy from '@/app/owner/Busy';
import DeclineBack from '@/app/owner/DeclineBack';
import JustIn from '@/app/owner/JustIn';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
export const baht = (n: number) => '฿' + n.toLocaleString('en-US');

// how long a request has been waiting
function waiting(sentAt: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(sentAt)) / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const text = minutes < 60 ? `${minutes} min` : hours < 48 ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : `${days} days`;
  return { text: `waiting ${text}`, late: late(sentAt, now) };
}

export const REASONS: Record<DeclineReason, string> = {
  full: 'Full that night',
  unreachable: 'Could not reach the guest',
  repairs: 'Room closed for repairs',
  other: 'Something else',
};

// The header on every tab, from the book's layout, so it stays put while a tab loads. The Requests tab
// carries a lantern-red dot while requests wait for an answer, so the owner sees it from the rack or the
// register too; how many, and which are late, the sheet itself says. The tabs sit just below the header rather than in it,
// so they can stay at the top of the window while a long sheet scrolls (globals.css).
export async function BookTop() {
  const waiting = await waitingNow();
  return (
    <>
      <header className="owner-top">
        <p className="wm" lang="th">{hotel.wordmark}</p>
        <h1>Request book</h1>
        <form action={logout}>
          <button className="owner-out" type="submit">Sign out</button>
        </form>
      </header>
      <BookTabs first={waiting} />
    </>
  );
}

// "answer" is a request still waiting, with Confirm and Decline; "ahead" is a confirmed stay to come; "kept"
// is a line in the register, with what became of it
export type EntryKind = 'answer' | 'ahead' | 'kept';

export function Entry({ b, kind, today, now, declining }: { b: Booking; kind: EntryKind; today: string; now?: number; declining?: string }) {
  const age = kind === 'answer' && now ? waiting(b.createdAt, now) : null;
  return (
    <li className="entry" id={b.ref}>
      <p className="entry-ref">
        <b>{b.ref}</b>
        <span>sent {when(b.createdAt)}</span>
        {age && <em className="entry-age" data-late={age.late || undefined}>{age.text}</em>}
        {kind === 'answer' && <JustIn sent={b.createdAt} />}
      </p>
      <div className="entry-guest">
        <p className="entry-name">{b.guest.name}</p>
        <a href={`mailto:${b.guest.email}`}>{b.guest.email}</a>
        {b.guest.contact && <span>{b.guest.contact}</span>}
      </div>
      <div className="entry-stay">
        <p>{roomOf(b.roomId).name}</p>
        <span>
          {weekDay(b.checkIn)} to {weekDay(checkOutOf(b.checkIn, b.nights))} {checkOutOf(b.checkIn, b.nights).slice(0, 4)}, {b.nights} {b.nights === 1 ? 'night' : 'nights'}
        </span>
      </div>
      <p className="entry-total">{baht(b.total)}</p>
      {b.note && <p className="entry-note">&ldquo;{b.note}&rdquo;</p>}
      {kind === 'kept' && <p className="entry-state">{stateOf(b, today)}</p>}
      {kind === 'ahead' && (
        <div className="entry-act">
          <ChangeStay b={b} today={today} />
        </div>
      )}
      {kind === 'answer' && (
        <div className="entry-act">
          <form action={confirmBooking}>
            <input type="hidden" name="ref" value={b.ref} />
            <Busy label="Confirm" busy="Confirming…" />
          </form>
          {/* while Decline is open, Confirm steps out of the way (globals.css), so the only red button left is
              the one that declines, and the heading says what is happening */}
          <details className="decline" open={declining !== undefined}>
            <summary>
              <span className="decline-shut">Decline</span>
              <span className="decline-open">Declining {b.guest.name}&rsquo;s request</span>
            </summary>
            <form action={declineBooking}>
              <input type="hidden" name="ref" value={b.ref} />
              <fieldset>
                <legend>Why? The guest&rsquo;s email is worded from this.</legend>
                {(Object.keys(REASONS) as DeclineReason[]).map((r) => (
                  <label key={r}>
                    <input type="radio" name="reason" value={r} required defaultChecked={declining === 'note' && r === 'other'} />
                    {REASONS[r]}
                  </label>
                ))}
              </fieldset>
              <label className="decline-note">
                <span>For &ldquo;something else&rdquo;, the reason in your words to the guest</span>
                <textarea name="note" rows={2} maxLength={600} />
              </label>
              {declining && <p className="msg bad" role="alert">{declining === 'note' ? 'Write the reason for the guest first.' : 'Choose a reason first.'}</p>}
              <div className="decline-go">
                <Busy label="Decline and email the guest" busy="Declining…" />
                <DeclineBack />
              </div>
            </form>
          </details>
        </div>
      )}
    </li>
  );
}

function stateOf(b: Booking, today: string) {
  const ahead = checkOutOf(b.checkIn, b.nights) > today;
  if (b.status === 'declined') return `Declined: ${b.decline ? REASONS[b.decline.reason].toLowerCase() : 'no reason kept'}${b.decline?.note ? `. “${b.decline.note}”` : ''}`;
  if (b.status === 'cancelled') return 'Cancelled';
  if (b.status === 'confirmed') return ahead ? 'Confirmed' : 'Stayed';
  return ahead ? <Link href={`/owner#${b.ref}`} prefetch={false}>Waiting for an answer on the Requests tab</Link> : 'Never answered';
}
