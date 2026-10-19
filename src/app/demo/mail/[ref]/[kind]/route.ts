// GET /demo/mail/SH-XXXXX/confirmed: in the public demo, the email the site would have sent for a booking,
// built afresh from the booking as it stands, so visitors can read what a guest or the owner would get.
// Only in the demo: on a real site this would show a guest's details to anyone holding the ref.
import { availability } from '@/lib/booking/model';
import { cancelledMail, changedMail, confirmedMail, declinedMail, ownerMail, receivedMail } from '@/lib/booking/mail';
import { bookingStore } from '@/lib/booking/store';
import { isDemo, isMailKind } from '@/lib/demo';

export const dynamic = 'force-dynamic';

const missing = () => new Response('Not found', { status: 404 });

export async function GET(req: Request, { params }: { params: Promise<{ ref: string; kind: string }> }) {
  const { ref, kind } = await params;
  const store = bookingStore();
  if (!isDemo() || !store || !isMailKind(kind)) return missing();
  const b = (await store.search(ref, 5)).find((x) => x.ref === ref);
  if (!b) return missing();
  const origin = new URL(req.url).origin;

  let mail;
  if (kind === 'received') mail = receivedMail(b);
  else if (kind === 'owner') mail = ownerMail(b, origin);
  else if (kind === 'confirmed') mail = confirmedMail(b);
  else if (kind === 'changed') mail = changedMail(b);
  else if (kind === 'cancelled') mail = cancelledMail(b);
  else if (b.decline) mail = declinedMail(b, b.decline, availability(await store.taken(b.checkIn, b.nights), b.checkIn, b.nights), origin);
  else return missing();

  return new Response(mail.html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
