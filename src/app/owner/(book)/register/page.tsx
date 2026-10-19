// The Register tab of the owner's request book: every stay, kept a month at a time like the pages of the
// book at the front desk, with the month's figures ruled off at the top of the page. The search box looks
// across every month. Both read only what they show from the store, so the page stays the same size after
// years of bookings.
import type { Metadata } from 'next';
import { PendingLink } from '@/app/owner/Pending';
import FindBox from '@/app/owner/FindBox';
import { hotel, rooms } from '@/content/site';
import { bangkokToday, shortName, weekDay, type Booking, type DeclineReason } from '@/lib/booking/model';
import { bookingStore } from '@/lib/booking/store';
import { baht, Entry } from '@/app/owner/book';
import { byArrival, monthFrom, shiftMonth, tally, type Month } from '@/app/owner/ledger';

export const metadata: Metadata = { title: `Register · ${hotel.name}`, robots: { index: false } };
export const dynamic = 'force-dynamic';

const FOUND_AT_MOST = 50;

const monthName = (m: Month) => new Date(`${m.from}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const percent = (n: number) => `${Math.round(n * 100)}%`;

const WHY: Record<DeclineReason, string> = { full: 'full', unreachable: 'guest unreachable', repairs: 'repairs', other: 'other' };

type Params = { month?: string; q?: string };

export default async function OwnerRegister({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const store = bookingStore();
  const today = bangkokToday();
  const month = monthFrom(params.month, today);
  const q = (params.q ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);

  return (
    <>

      <FindBox q={q} month={params.month ? month.key : undefined} />

      {!store ? (
        <p className="owner-note">No booking store is set up on this site, so there is nothing to show. The README explains how to connect Supabase.</p>
      ) : q ? (
        <Found q={q} month={month} today={today} found={await store.search(q, FOUND_AT_MOST)} />
      ) : (
        <Page month={month} today={today} stays={await store.stays({ from: month.from, until: month.until })} />
      )}
    </>
  );
}

function Page({ month, today, stays }: { month: Month; today: string; stays: Booking[] }) {
  const t = tally(stays, month);
  const arriving = stays.filter((b) => b.checkIn >= month.from).sort(byArrival);
  const [prev, next] = [shiftMonth(month, -1), shiftMonth(month, 1)];
  const reasons = (Object.entries(t.why) as [DeclineReason, number][]).map(([r, n]) => `${n} ${WHY[r]}`).join(', ');

  return (
    <section className="sheet" aria-labelledby="sheet-month">
      <div className="sheet-head">
        <h2 id="sheet-month">
          {monthName(month)} <span>{arriving.length || ''}</span>
        </h2>
        <nav className="owner-months" aria-label="Months">
          <PendingLink href={`/owner/register?month=${prev.key}`} rel="prev">‹ {monthName(prev)}</PendingLink>
          {month.key !== today.slice(0, 7) && <PendingLink href="/owner/register">This month</PendingLink>}
          <PendingLink href={`/owner/register?month=${next.key}`} rel="next">{monthName(next)} ›</PendingLink>
        </nav>
      </div>
      <div className="ledger-page">
        <p className="tally">
          <span className="tally-head">Month&rsquo;s figures</span>
          <span><b>{t.nights}</b> room-nights sold</span>
          <span><b>{baht(t.revenue)}</b> from confirmed stays</span>
          <span>
            occupancy{' '}
            {rooms.map((r, i) => (
              <span key={r.id} className="tally-room">
                {shortName(r.id)} <b>{percent(t.occupancy[r.id])}</b>
                {i < rooms.length - 1 && ', '}
              </span>
            ))}
          </span>
          <span><b>{t.declined}</b> declined{reasons && `: ${reasons}`}</span>
        </p>
        <ol className="ledger">
          {arriving.length === 0 && <li className="ledger-empty">No stays arrive this month.</li>}
          {/* the month runs by arrival, so each new arrival day gets a line of its own, as in a book at the desk;
              the left column of each stay is when it was asked for, which would otherwise read as the order */}
          {arriving.flatMap((b, i) => [
            ...(i === 0 || b.checkIn !== arriving[i - 1].checkIn
              ? [<li key={`day-${b.checkIn}`} className="ledger-day">{weekDay(b.checkIn)}</li>]
              : []),
            <Entry key={b.ref} b={b} kind="kept" today={today} />,
          ])}
        </ol>
      </div>
    </section>
  );
}

function Found({ q, month, today, found }: { q: string; month: Month; today: string; found: Booking[] }) {
  return (
    <section className="sheet" aria-labelledby="sheet-found">
      <div className="sheet-head">
        <h2 id="sheet-found">
          Found for &ldquo;{q}&rdquo; <span>{found.length || ''}</span>
        </h2>
        <nav className="owner-months" aria-label="Months">
          <PendingLink href={`/owner/register?month=${month.key}`}>Back to {monthName(month)}</PendingLink>
        </nav>
      </div>
      {found.length === FOUND_AT_MOST && <p className="owner-note">Showing the {FOUND_AT_MOST} newest requests. Type more of the name or the ref to narrow it.</p>}
      <ol className="ledger">
        {found.length === 0 && <li className="ledger-empty">Nothing in the book matches that.</li>}
        {found.map((b) => <Entry key={b.ref} b={b} kind="kept" today={today} />)}
      </ol>
    </section>
  );
}
