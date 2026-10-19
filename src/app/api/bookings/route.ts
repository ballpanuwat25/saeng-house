// POST /api/bookings: a guest's request. Checks the nights are still free, saves it, and emails the guest
// and the owner.
// The price is worked out here from the house's own rates, never taken from the browser.
import { parseRequest } from '@/lib/booking/model';
import { ownerMail, receivedMail, sendMail } from '@/lib/booking/mail';
import { bookingStore } from '@/lib/booking/store';
import { isDemo, mailPath } from '@/lib/demo';
import { BOOKING, clientIp, knock } from '@/lib/owner/throttle';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  // a field people never see; a bot that fills every field fills this one too
  if (body?.website) return Response.json({ ok: true, demo: true });
  const parsed = parseRequest(body);
  if (!parsed.ok) return Response.json({ ok: false, error: parsed.error }, { status: 400 });
  const store = bookingStore();
  if (!store) return Response.json({ ok: true, demo: true });
  // the public demo takes a few requests from each visitor, so nobody can fill every room for the next one
  if (isDemo() && !(await knock(BOOKING, clientIp(req.headers))).open)
    return Response.json({ ok: false, error: 'That is plenty of requests from here for one demo. Try again in an hour, or open the owner’s book to answer the ones you sent.' }, { status: 429 });

  const result = await store.request(parsed.value);
  if (!result.ok) return Response.json({ ok: false, fullOn: result.fullOn }, { status: 409 });
  const { booking } = result;
  // the request is saved either way; a mail that fails is logged, and the owner still finds the request in the book
  const send = (to: string, mail: { subject: string; html: string }, tag: string) => sendMail(to, mail, tag).catch((err) => console.error(err));
  // the owner's address comes from OWNER_EMAIL; on a developer's machine without it the mail still goes to
  // .data/outbox, so the whole flow can be seen
  const { OWNER_EMAIL, RESEND_API_KEY } = process.env;
  await Promise.all([
    send(booking.guest.email, receivedMail(booking), `${booking.ref}-received`),
    (OWNER_EMAIL || !RESEND_API_KEY) && send(OWNER_EMAIL ?? '', ownerMail(booking, new URL(req.url).origin), `${booking.ref}-owner`),
  ]);
  // the public demo sends nothing, so the ticket links to both emails instead
  const mails = isDemo() ? { guest: mailPath(booking.ref, 'received'), owner: mailPath(booking.ref, 'owner') } : undefined;
  return Response.json({ ok: true, ref: booking.ref, email: booking.guest.email, total: booking.total, mails });
}
