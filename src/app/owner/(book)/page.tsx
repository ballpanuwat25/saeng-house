// The Requests tab of the owner's request book: requests waiting for an answer and confirmed stays still
// to come, on ticket paper like the register at the front desk. Neither sheet is paged, because both only
// hold stays that have not ended; everything finished or declined is kept on the Register tab. Works
// without JavaScript; each answer is a plain form posting to a server action.
import type { Metadata } from 'next';
import { hotel } from '@/content/site';
import { bangkokToday, HOLDING, type Booking } from '@/lib/booking/model';
import { bookingStore } from '@/lib/booking/store';
import { Entry, type EntryKind } from '@/app/owner/book';
import { AddBooking } from '@/app/owner/StayForms';
import { byArrival } from '@/app/owner/ledger';

export const metadata: Metadata = { title: `Request book · ${hotel.name}`, robots: { index: false } };
export const dynamic = 'force-dynamic';

// the line at the top after an answer, a change or a new booking
const DONE: Record<string, string> = { confirmed: 'confirmed', declined: 'declined', cancelled: 'cancelled', moved: 'changed', added: 'added and confirmed' };
const MAIL: Record<string, string> = {
  failed: 'The email to the guest did not go out, so write to them yourself.',
  none: 'No email was sent, so let the guest know yourself.',
  sent: 'The guest has been emailed.',
};

const SHEETS = {
  new: { title: 'Waiting for an answer', empty: 'No requests waiting.', kind: 'answer' },
  confirmed: { title: 'Confirmed', empty: 'Nothing confirmed ahead yet.', kind: 'ahead' },
} as const satisfies Record<string, { title: string; empty: string; kind: EntryKind }>;

type Params = { done?: string; what?: string; mail?: string; declining?: string; why?: string };

export default async function OwnerRequests({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const store = bookingStore();
  const today = bangkokToday();
  // read once per request, so every entry measures its wait from the same moment
  const now = Date.now();
  // a stay leaves this tab on its checkout morning
  const ahead = store ? (await store.stays({ from: today, status: HOLDING })).sort(byArrival) : null;
  const shelves: Record<keyof typeof SHEETS, Booking[]> | null = ahead && {
    new: ahead.filter((b) => b.status === 'requested'),
    confirmed: ahead.filter((b) => b.status === 'confirmed'),
  };

  return (
    <>
      {params.done && (
        <p className="owner-note" role="status">
          {params.done} {DONE[params.what ?? ''] ?? 'saved'}. {MAIL[params.mail ?? 'sent'] ?? MAIL.sent}
        </p>
      )}

      {shelves && <AddBooking today={today} />}

      {!shelves ? (
        <p className="owner-note">No booking store is set up on this site, so there is nothing to show. The README explains how to connect Supabase.</p>
      ) : (
        (Object.keys(SHEETS) as (keyof typeof SHEETS)[]).map((shelf) => (
          <section key={shelf} className="sheet" aria-labelledby={`sheet-${shelf}`}>
            <h2 id={`sheet-${shelf}`}>
              {SHEETS[shelf].title} <span>{shelves[shelf].length || ''}</span>
            </h2>
            <ol className="ledger">
              {shelves[shelf].length === 0 && <li className="ledger-empty">{SHEETS[shelf].empty}</li>}
              {shelves[shelf].map((b) => (
                <Entry key={b.ref} b={b} kind={SHEETS[shelf].kind} today={today} now={now} declining={params.declining === b.ref ? params.why : undefined} />
              ))}
            </ol>
          </section>
        ))
      )}
    </>
  );
}
