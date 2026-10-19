// POST /api/bookings: a guest's request. Checks the nights are still free, saves it, and emails the guest.
// The price is worked out here from the house's own rates, never taken from the browser.
import { parseRequest } from '@/lib/booking/model';
import { receivedMail, sendMail } from '@/lib/booking/mail';
import { bookingStore } from '@/lib/booking/store';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  // a field people never see; a bot that fills every field fills this one too
  if (body?.website) return Response.json({ ok: true, demo: true });
  const parsed = parseRequest(body);
  if (!parsed.ok) return Response.json({ ok: false, error: parsed.error }, { status: 400 });
  const store = bookingStore();
  if (!store) return Response.json({ ok: true, demo: true });

  const result = await store.request(parsed.value);
  if (!result.ok) return Response.json({ ok: false, fullOn: result.fullOn }, { status: 409 });
  const { booking } = result;
  try {
    await sendMail(booking.guest.email, receivedMail(booking), `${booking.ref}-received`);
  } catch (err) {
    // the request is saved either way; the owner sees it and can reach the guest
    console.error(err);
  }
  return Response.json({ ok: true, ref: booking.ref, email: booking.guest.email, total: booking.total });
}
