// GET /api/demo/reset: the public demo's nightly clean (src/lib/demo.ts). Throws every booking away and lays
// down a fresh year of made-up ones around today, so whatever visitors booked, declined or cancelled is
// gone by morning and the book never stays full. Vercel's cron calls it (vercel.json) with CRON_SECRET as a
// bearer token; without that secret set it refuses everyone, and outside the demo it does not exist.
import { bangkokToday } from '@/lib/booking/model';
import { demoBookings } from '@/lib/booking/demo-seed';
import { bookingStore } from '@/lib/booking/store';
import { isDemo } from '@/lib/demo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const store = bookingStore();
  if (!isDemo() || !store) return new Response('Not found', { status: 404 });
  const { CRON_SECRET } = process.env;
  if (!CRON_SECRET || req.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });
  const bookings = demoBookings(bangkokToday());
  await store.replaceAll(bookings);
  return Response.json({ ok: true, bookings: bookings.length });
}
