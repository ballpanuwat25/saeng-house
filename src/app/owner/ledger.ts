// The sums behind the request book. The register is kept a month at a time, like the pages of the book at
// the front desk, and each page carries its own figures: what was sold, what it earned, how full each kind
// of room was and what was turned away.
import { rooms } from '@/content/site';
import { addDays, nightsOf, type Booking, type DeclineReason, type RoomId } from '@/lib/booking/model';

export type Month = { key: string; from: string; until: string; days: number };

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

// "2026-11" to the first day of November and the first day of December, so a month is [from, until)
export function monthOf(key: string): Month {
  const [, y, m] = MONTH.exec(key)!;
  const from = `${y}-${m}-01`;
  const days = new Date(Date.UTC(+y, +m, 0)).getUTCDate();
  return { key, from, until: addDays(from, days), days };
}

// the month asked for in the address, or the one today falls in when there is none or it is not a month
export const monthFrom = (param: string | undefined, today: string) => monthOf(param && MONTH.test(param) ? param : today.slice(0, 7));

export const shiftMonth = (m: Month, by: 1 | -1) => monthOf((by === 1 ? m.until : addDays(m.from, -1)).slice(0, 7));

export type Tally = {
  nights: number;
  revenue: number;
  occupancy: Record<RoomId, number>;
  declined: number;
  why: Partial<Record<DeclineReason, number>>;
};

// Only confirmed stays count as sold, and only for their nights inside the month, so a stay from the 30th
// for three nights is split between two pages and each page's occupancy stays at or under 100%. Revenue is
// taken from what the guest was quoted, night by night, in case the price changes later. Declines count
// on the page of the arrival they were asked for, as the entries do.
export function tally(stays: Booking[], month: Month): Tally {
  const sold = Object.fromEntries(rooms.map((r) => [r.id, 0])) as Record<RoomId, number>;
  let revenue = 0;
  let declined = 0;
  const why: Tally['why'] = {};
  for (const b of stays) {
    if (b.status === 'confirmed') {
      const inside = nightsOf(b.checkIn, b.nights).filter((n) => n >= month.from && n < month.until).length;
      sold[b.roomId] += inside;
      revenue += (b.total / b.nights) * inside;
    } else if (b.status === 'declined' && b.checkIn >= month.from) {
      declined++;
      if (b.decline) why[b.decline.reason] = (why[b.decline.reason] ?? 0) + 1;
    }
  }
  const occupancy = Object.fromEntries(rooms.map((r) => [r.id, sold[r.id] / (r.count * month.days)])) as Record<RoomId, number>;
  return { nights: Object.values(sold).reduce((a, n) => a + n, 0), revenue: Math.round(revenue), occupancy, declined, why };
}

// the nearest stay first, and two requests for the same day in the order they came in
export const byArrival = (a: Booking, b: Booking) => a.checkIn.localeCompare(b.checkIn) || a.createdAt.localeCompare(b.createdAt);
