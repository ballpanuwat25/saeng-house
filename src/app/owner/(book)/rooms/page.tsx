// The Rooms tab of the owner's request book: four weeks of the room rack, so the owner sees at a glance
// which nights each kind of room is full and who is in. Only stays that hold a room are on it: requests
// still waiting, edged in lantern red so they stand out, and confirmed stays.
import type { Metadata } from 'next';
import Link from 'next/link';
import { hotel, rooms } from '@/content/site';
import { addDays, bangkokToday, checkOutOf, HOLDING, roomOf, type Booking } from '@/lib/booking/model';
import { bookingStore } from '@/lib/booking/store';
import { baht, day } from '@/app/owner/book';
import { rack } from '@/app/owner/rack';
import RackJump from '@/app/owner/RackJump';
import RackSlips, { type Slip } from '@/app/owner/RackSlips';

export const metadata: Metadata = { title: `Rooms · ${hotel.name}`, robots: { index: false } };
export const dynamic = 'force-dynamic';

const NIGHTS = 28;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const date = (iso: string) => new Date(`${iso}T00:00:00Z`);
const dayMonth = (iso: string) => date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const short = (name: string) => name.replace(/^The | Room$/g, '');
const surname = (name: string) => name.trim().split(' ').at(-1) ?? name;

// a strip opens the stay where it is kept: the Requests tab while it is still to come, the register after
function entryOf(b: Booking, today: string) {
  return checkOutOf(b.checkIn, b.nights) > today ? `/owner#${b.ref}` : `/owner/register?month=${b.checkIn.slice(0, 7)}#${b.ref}`;
}

export default async function OwnerRooms({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from: asked } = await searchParams;
  const store = bookingStore();
  const today = bangkokToday();
  const from = asked && ISO.test(asked) && !Number.isNaN(Date.parse(asked)) ? asked : today;
  const until = addDays(from, NIGHTS);
  const nights = Array.from({ length: NIGHTS }, (_, i) => addDays(from, i));

  if (!store) {
    return (
      <p className="owner-note">No booking store is set up on this site, so there is nothing to show. The README explains how to connect Supabase.</p>
    );
  }

  const stays = await store.stays({ from, until, status: HOLDING });
  const shelves = rack(stays, from, NIGHTS);
  const slips: Record<string, Slip> = Object.fromEntries(
    stays.map((b) => [
      b.ref,
      {
        ref: b.ref, name: b.guest.name, room: roomOf(b.roomId).name, total: baht(b.total), note: b.note, waiting: b.status === 'requested',
        nights: `${day(b.checkIn)} to ${day(checkOutOf(b.checkIn, b.nights))}, ${b.nights} ${b.nights === 1 ? 'night' : 'nights'}`,
        state: b.status === 'requested' ? 'Waiting for your answer' : checkOutOf(b.checkIn, b.nights) > today ? 'Confirmed' : 'Stayed',
      },
    ]),
  );
  // the first line of each kind of room, after the row of dates
  const firstLine = shelves.reduce<number[]>((at, s, i) => [...at, i === 0 ? 2 : at[i - 1] + shelves[i - 1].lines], []);
  const lastRow = firstLine.at(-1)! + shelves.at(-1)!.lines;

  return (
    <>

      <section className="sheet" aria-labelledby="sheet-rack">
        <div className="sheet-head">
          <h2 id="sheet-rack">
            {dayMonth(from)} to {dayMonth(addDays(until, -1))} {addDays(until, -1).slice(0, 4)}
          </h2>
          {/* the start night is the one thing here the owner fills in, so it reads as a blank on a form; the
              links that step through the weeks sit quieter beneath it */}
          <div className="rack-controls">
            <RackJump from={from} />
            <nav className="owner-months" aria-label="Weeks">
              <Link href={`/owner/rooms?from=${addDays(from, -NIGHTS)}`} rel="prev">‹ Four weeks earlier</Link>
              {from !== today && <Link href="/owner/rooms">From tonight</Link>}
              <Link href={`/owner/rooms?from=${until}`} rel="next">Four weeks later ›</Link>
            </nav>
          </div>
        </div>

        <div className="ledger-page">
          <p className="tally">
            <span className="tally-head">Full nights</span>
            {shelves.map((s) => (
              <span key={s.id}>
                {short(roomOf(s.id).name)} <b>{s.full.length}</b>
                {s.full.length > 0 && `: ${s.full.map(dayMonth).join(', ')}`}
              </span>
            ))}
            <span className="rack-key">A red edge is a request still waiting for your answer.</span>
          </p>

          <RackSlips slips={slips}>
            <div className="rack" style={{ '--nights': NIGHTS } as React.CSSProperties}>
              <span className="rack-corner" aria-hidden />
              {nights.map((n, i) => {
                const d = date(n);
                const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                return (
                  <span key={n} className="rack-night" style={{ gridColumn: i + 2, gridRow: `1 / ${lastRow}` }} data-weekend={weekend || undefined} data-tonight={n === today || undefined}>
                    <span className="rack-date">
                      {(i === 0 || d.getUTCDate() === 1) && <span className="rack-month">{d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}</span>}
                      <span className="rack-wd">{d.toLocaleDateString('en-GB', { weekday: 'narrow', timeZone: 'UTC' })}</span>
                      <b>{d.getUTCDate()}</b>
                    </span>
                  </span>
                );
              })}

              {shelves.map((s, k) => {
                const room = rooms.find((r) => r.id === s.id)!;
                return [
                  <p key={`${s.id}-kind`} className="rack-kind" style={{ gridRow: `${firstLine[k]} / span ${s.lines}` }}>
                    {short(room.name)}
                    <span>{room.count} rooms</span>
                  </p>,
                  ...Array.from({ length: s.lines }, (_, line) => (
                    <span key={`${s.id}-${line}`} className="rack-line" data-last={line === s.lines - 1 || undefined} style={{ gridRow: firstLine[k] + line }} aria-hidden />
                  )),
                  ...s.strips.map(({ b, line, start, span, before, after }) => (
                    <Link
                      key={b.ref}
                      href={entryOf(b, today)}
                      className="strip"
                      data-waiting={b.status === 'requested' || undefined}
                      data-before={before || undefined}
                      data-after={after || undefined}
                      style={{ gridColumn: `${start + 2} / span ${span}`, gridRow: firstLine[k] + line }}
                      data-ref={b.ref}
                      aria-label={`${b.guest.name}, ${room.name}, ${day(b.checkIn)} to ${day(checkOutOf(b.checkIn, b.nights))}${b.status === 'requested' ? ', waiting for an answer' : ''}`}
                    >
                      {surname(b.guest.name)}
                    </Link>
                  )),
                ];
              })}
            </div>
          </RackSlips>
        </div>
      </section>
    </>
  );
}
