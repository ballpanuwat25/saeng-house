// A year of made-up bookings for the public demo (src/lib/demo.ts), laid down fresh each night around the
// day it is made: eleven months of stays behind it and two ahead, never more rooms held on a night than the
// house has. Past stays mostly stayed, a few were declined or cancelled; ahead, some are confirmed and some
// still wait for an answer, a few of them past the hour the guest was promised. The same day always gives
// the same book, so a visitor who reloads sees the same names.
import { rooms } from '@/content/site';
import { addDays, checkOutOf, HOLDING, totalOf, type Booking, type BookingStatus, type DeclineReason, type RoomId } from '@/lib/booking/model';

const FIRST = ['Anna', 'Somchai', 'Mei', 'Lukas', 'Priya', 'Tom', 'Nattaya', 'Hiroshi', 'Clara', 'Ahmed', 'Sofia', 'Kenji', 'Ploy', 'James', 'Elena', 'Wei', 'Fatima', 'Noah', 'Arun', 'Chloe', 'Mateo', 'Yuki', 'Kanya', 'Oliver', 'Ines', 'Daniel', 'Lena', 'Pim'];
const LAST = ['Svensson', 'Wongsakul', 'Chen', 'Becker', 'Raman', 'Hughes', 'Srisuk', 'Tanaka', 'Moreau', 'Karim', 'Rossi', 'Sato', 'Charoen', 'Walsh', 'Petrova', 'Liu', 'Haddad', 'Kim', 'Mehta', 'Dubois', 'Garcia', 'Ito', 'Boonmee', 'Fischer', 'Novak', 'Park'];
const NOTES = ['Arriving late, around 23:00.', 'Could we have a cot for our son?', 'Anniversary trip.', 'Vegetarian breakfast please.', 'We will come by boat from the pier.'];
const REF_LETTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const DAY = 864e5;

// a small fixed-sequence generator, so a given day always makes the same book
function sequence(seedText: string) {
  let seed = [...seedText].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7);
  const next = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  return { next, pick: <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)] };
}

export function demoBookings(today: string, now = Date.now(), count = 220): Booking[] {
  const { next, pick } = sequence(today);
  const held: Record<string, number> = {};
  const fits = (room: RoomId, checkIn: string, nights: number) =>
    Array.from({ length: nights }, (_, i) => addDays(checkIn, i)).every((d) => (held[`${room}:${d}`] ?? 0) < rooms.find((r) => r.id === room)!.count);
  const hold = (room: RoomId, checkIn: string, nights: number) => {
    for (let i = 0; i < nights; i++) held[`${room}:${addDays(checkIn, i)}`] = (held[`${room}:${addDays(checkIn, i)}`] ?? 0) + 1;
  };
  const refs = new Set<string>();
  const newRef = () => {
    let ref;
    do ref = 'SH-' + Array.from({ length: 5 }, () => REF_LETTERS[Math.floor(next() * 32)]).join('');
    while (refs.has(ref));
    refs.add(ref);
    return ref;
  };

  const out: Booking[] = [];
  for (let tries = 0; out.length < count && tries < count * 20; tries++) {
    const checkIn = addDays(today, Math.floor(next() * 395) - 335);
    const roomId = pick(['lattice', 'lattice', 'moon', 'moon', 'roof'] as RoomId[]);
    const nights = pick([1, 2, 2, 3, 3, 4, 5, 7]);
    const ahead = checkOutOf(checkIn, nights) > today;
    const r = next();
    let status: BookingStatus = ahead ? (r < 0.3 ? 'requested' : r < 0.9 ? 'confirmed' : 'declined') : r < 0.78 ? 'confirmed' : r < 0.95 ? 'declined' : 'cancelled';
    if (HOLDING.includes(status) && !fits(roomId, checkIn, nights)) status = 'declined';
    if (HOLDING.includes(status)) hold(roomId, checkIn, nights);

    // sent a few days to a few weeks before arrival, never in the future. A request still waiting was sent
    // either within the hour (about a third of them) or between an hour and a day and a half ago, so the
    // book shows both fresh requests and late ones
    const sentBefore = Date.parse(`${checkIn}T00:00:00Z`) - (2 + Math.floor(next() * 45)) * DAY + Math.floor(next() * DAY);
    const waitedMinutes = next() < 0.35 ? 3 + next() * 50 : 70 + next() * 2090;
    const createdAt = status === 'requested' ? now - Math.floor(waitedMinutes * 60_000) : Math.min(sentBefore, now - Math.floor(next() * 3 * DAY));

    const first = pick(FIRST);
    const last = pick(LAST);
    const reason: DeclineReason = pick(['full', 'full', 'full', 'unreachable', 'repairs', 'other']);
    out.push({
      ref: newRef(),
      roomId,
      checkIn,
      nights,
      status,
      total: totalOf(roomId, nights),
      createdAt: new Date(createdAt).toISOString(),
      guest: {
        name: `${first} ${last}`,
        email: `${first}.${last}${10 + Math.floor(next() * 90)}@example.com`.toLowerCase(),
        contact: next() < 0.6 ? `+66 8${String(Math.floor(next() * 1e8)).padStart(8, '0')}` : next() < 0.5 ? `LINE @${first.toLowerCase()}${last[0].toLowerCase()}` : '',
      },
      note: next() < 0.2 ? pick(NOTES) : '',
      ...(status === 'declined' && { decline: { reason, note: reason === 'other' ? 'We are closed that week for a family wedding.' : '' } }),
    });
  }
  return out;
}
