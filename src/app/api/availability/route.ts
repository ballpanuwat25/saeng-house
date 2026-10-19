// GET /api/availability?checkIn=2026-10-25&nights=2: how many rooms of each kind are free for that stay.
// `live: false` means there is no store behind the site, and the ticket stays a demo.
import { availability, parseStay } from '@/lib/booking/model';
import { bookingStore } from '@/lib/booking/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const stay = parseStay({ checkIn: q.get('checkIn'), nights: q.get('nights') });
  if (!stay.ok) return Response.json({ error: stay.error }, { status: 400 });
  const store = bookingStore();
  if (!store) return Response.json({ live: false });
  const { checkIn, nights } = stay.value;
  return Response.json({ live: true, rooms: availability(await store.taken(checkIn, nights), checkIn, nights) });
}
