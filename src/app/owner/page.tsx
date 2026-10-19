// The owner's request book: every booking on three sheets of ticket paper, like the register at the front
// desk. Works without JavaScript; each answer is a plain form posting to a server action.
import type { Metadata } from 'next';
import { hotel } from '@/content/site';
import { bangkokToday, checkOutOf, roomOf, type Booking, type DeclineReason } from '@/lib/booking/model';
import { bookingStore } from '@/lib/booking/store';
import { confirmBooking, declineBooking, logout } from '@/app/owner/actions';
import { register, type Shelf } from '@/app/owner/register';

export const metadata: Metadata = { title: `Request book · ${hotel.name}`, robots: { index: false } };
export const dynamic = 'force-dynamic';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
const baht = (n: number) => '฿' + n.toLocaleString('en-US');

const REASONS: Record<DeclineReason, string> = {
  full: 'Full that night',
  unreachable: 'Could not reach the guest',
  repairs: 'Room closed for repairs',
  other: 'Something else',
};

const SHEETS: Record<Shelf, { title: string; empty: string }> = {
  new: { title: 'Waiting for an answer', empty: 'No requests waiting.' },
  confirmed: { title: 'Confirmed', empty: 'Nothing confirmed ahead yet.' },
  past: { title: 'Past and declined', empty: 'Nothing here yet.' },
};

type Params = { done?: string; what?: string; mail?: string; declining?: string; why?: string };

export default async function OwnerBook({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const store = bookingStore();
  const today = bangkokToday();
  const book = store ? register(await store.list(), today) : null;

  return (
    <main className="owner wrap">
      <header className="owner-top">
        <p className="wm" lang="th">{hotel.wordmark}</p>
        <h1>Request book</h1>
        <form action={logout}>
          <button className="owner-out" type="submit">Sign out</button>
        </form>
      </header>

      {params.done && (
        <p className="owner-note" role="status">
          {params.done} {params.what === 'declined' ? 'declined' : 'confirmed'}.{' '}
          {params.mail === 'failed' ? 'The email to the guest did not go out, so write to them yourself.' : 'The guest has been emailed.'}
        </p>
      )}

      {!book ? (
        <p className="owner-note">No booking store is set up on this site, so there is nothing to show. The README explains how to connect Supabase.</p>
      ) : (
        (Object.keys(SHEETS) as Shelf[]).map((shelf) => (
          <section key={shelf} className={`sheet sheet-${shelf}`} aria-labelledby={`sheet-${shelf}`}>
            <h2 id={`sheet-${shelf}`}>
              {SHEETS[shelf].title} <span>{book[shelf].length || ''}</span>
            </h2>
            <ol className="ledger">
              {book[shelf].length === 0 && <li className="ledger-empty">{SHEETS[shelf].empty}</li>}
              {book[shelf].map((b) => (
                <Entry key={b.ref} b={b} shelf={shelf} declining={params.declining === b.ref ? params.why : undefined} />
              ))}
            </ol>
          </section>
        ))
      )}
    </main>
  );
}

function Entry({ b, shelf, declining }: { b: Booking; shelf: Shelf; declining?: string }) {
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
          {day(b.checkIn)} to {day(checkOutOf(b.checkIn, b.nights))}, {b.nights} {b.nights === 1 ? 'night' : 'nights'}
        </span>
      </div>
      <p className="entry-total">{baht(b.total)}</p>
      {b.note && <p className="entry-note">&ldquo;{b.note}&rdquo;</p>}
      {shelf === 'past' && <p className="entry-state">{stateOf(b)}</p>}
      {shelf === 'new' && (
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

function stateOf(b: Booking) {
  if (b.status === 'declined') return `Declined: ${b.decline ? REASONS[b.decline.reason].toLowerCase() : 'no reason kept'}${b.decline?.note ? `. “${b.decline.note}”` : ''}`;
  if (b.status === 'cancelled') return 'Cancelled';
  return b.status === 'confirmed' ? 'Stayed' : 'Never answered';
}
