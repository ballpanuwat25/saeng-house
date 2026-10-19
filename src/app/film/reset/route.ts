// POST /film/reset: the start of each take on the film stage. Lays down the same fresh book as the demo's
// nightly reset (src/app/api/demo/reset), so every take today starts from the same bookings, and forgets
// this address's earlier requests, so the demo's limit of ten an hour never stops a run of takes.
import { bangkokToday } from '@/lib/booking/model';
import { demoBookings } from '@/lib/booking/demo-seed';
import { bookingStore } from '@/lib/booking/store';
import { filmOpen } from '@/lib/film';
import { BOOKING, clientIp, forgive } from '@/lib/owner/throttle';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const store = bookingStore();
  if (!filmOpen() || !store) return new Response('Not found', { status: 404 });
  const bookings = demoBookings(bangkokToday());
  await store.replaceAll(bookings);
  await forgive(BOOKING, clientIp(req.headers));
  return Response.json({ ok: true, bookings: bookings.length });
}
