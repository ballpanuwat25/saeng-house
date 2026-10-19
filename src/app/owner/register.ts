// How the request book is laid out: requests waiting for an answer, stays that are confirmed and still to
// come, and everything finished, declined or cancelled. A stay counts as past once its checkout day comes.
import { checkOutOf, type Booking } from '@/lib/booking/model';

export type Shelf = 'new' | 'confirmed' | 'past';

export function shelfOf(b: Booking, today: string): Shelf {
  if (checkOutOf(b.checkIn, b.nights) <= today || (b.status !== 'requested' && b.status !== 'confirmed')) return 'past';
  return b.status === 'requested' ? 'new' : 'confirmed';
}

// the nearest stay first: soonest arrival for what is coming, latest arrival for what is behind
export function register(all: Booking[], today: string): Record<Shelf, Booking[]> {
  const out: Record<Shelf, Booking[]> = { new: [], confirmed: [], past: [] };
  for (const b of all) out[shelfOf(b, today)].push(b);
  const soonest = (a: Booking, b: Booking) => a.checkIn.localeCompare(b.checkIn) || a.createdAt.localeCompare(b.createdAt);
  out.new.sort(soonest);
  out.confirmed.sort(soonest);
  out.past.sort((a, b) => soonest(b, a));
  return out;
}
