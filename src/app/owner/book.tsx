// What the two tabs of the request book share: the header with its tabs, and one entry on the sheet.
import Link from 'next/link';
import { hotel } from '@/content/site';
import { checkOutOf, roomOf, type Booking, type DeclineReason } from '@/lib/booking/model';
import { confirmBooking, declineBooking, logout } from '@/app/owner/actions';

export const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
export const baht = (n: number) => '฿' + n.toLocaleString('en-US');

export const REASONS: Record<DeclineReason, string> = {
  full: 'Full that night',
  unreachable: 'Could not reach the guest',
  repairs: 'Room closed for repairs',
  other: 'Something else',
};

export type Tab = 'requests' | 'register';

export function BookTop({ tab }: { tab: Tab }) {
  return (
    <header className="owner-top">
      <p className="wm" lang="th">{hotel.wordmark}</p>
      <h1>Request book</h1>
      <form action={logout}>
        <button className="owner-out" type="submit">Sign out</button>
      </form>
      <nav className="owner-tabs" aria-label="Request book">
        <Link href="/owner" aria-current={tab === 'requests' ? 'page' : undefined}>Requests</Link>
        <Link href="/owner/register" aria-current={tab === 'register' ? 'page' : undefined}>Register</Link>
      </nav>
    </header>
  );
}

// "answer" is a request still waiting, with Confirm and Decline; "ahead" is a confirmed stay to come; "kept"
// is a line in the register, with what became of it
export type EntryKind = 'answer' | 'ahead' | 'kept';

export function Entry({ b, kind, today, declining }: { b: Booking; kind: EntryKind; today: string; declining?: string }) {
  return (
    <li className="entry" id={b.ref}>
      <p className="entry-ref">
        <b>{b.ref}</b>
        <span>sent {when(b.createdAt)}</span>
      </p>
      <div className="entry-guest">
        <p className="entry-name">{b.guest.name}</p>
        <a href={`mailto:${b.guest.email}`}>{b.guest.email}</a>
        {b.guest.contact && <span>{b.guest.contact}</span>}
      </div>
      <div className="entry-stay">
        <p>{roomOf(b.roomId).name}</p>
        <span>
          {day(b.checkIn)} to {day(checkOutOf(b.checkIn, b.nights))} {checkOutOf(b.checkIn, b.nights).slice(0, 4)}, {b.nights} {b.nights === 1 ? 'night' : 'nights'}
        </span>
      </div>
      <p className="entry-total">{baht(b.total)}</p>
      {b.note && <p className="entry-note">&ldquo;{b.note}&rdquo;</p>}
      {kind === 'kept' && <p className="entry-state">{stateOf(b, today)}</p>}
      {kind === 'answer' && (
        <div className="entry-act">
          <form action={confirmBooking}>
            <input type="hidden" name="ref" value={b.ref} />
            <button className="btn" type="submit">Confirm</button>
          </form>
          <details className="decline" open={declining !== undefined}>
            <summary>Decline</summary>
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
              <button className="btn" type="submit">Decline and email the guest</button>
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
  return ahead ? <Link href={`/owner#${b.ref}`}>Waiting for an answer on the Requests tab</Link> : 'Never answered';
}
