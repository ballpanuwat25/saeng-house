// GET /demo/mail/SH-XXXXX/confirmed: in the public demo, the email the site would have sent for a booking,
// built afresh from the booking as it stands, so visitors can read what a guest or the owner would get.
// Only in the demo: on a real site this would show a guest's details to anyone holding the ref.
import { availability } from '@/lib/booking/model';
import { cancelledMail, changedMail, confirmedMail, declinedMail, ownerMail, receivedMail } from '@/lib/booking/mail';
import { bookingStore } from '@/lib/booking/store';
import { isDemo, isMailKind } from '@/lib/demo';

export const dynamic = 'force-dynamic';

// A route handler cannot render not-found.tsx itself (notFound() here answers with an empty 404), and this
// address is opened in a browser from the demo's ticket and book, so a ref that is not in the book gets the
// site's own 404 page, fetched from the framework's /_not-found, and plain text only if that fails.
async function missing(req: Request) {
  const page = await fetch(new URL('/_not-found', req.url), { cache: 'no-store' }).catch(() => null);
  if (!page) return new Response('Not found', { status: 404 });
  return new Response(await page.text(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}

export async function GET(req: Request, { params }: { params: Promise<{ ref: string; kind: string }> }) {
  const { ref, kind } = await params;
  const store = bookingStore();
  if (!isDemo() || !store || !isMailKind(kind)) return missing(req);
  const b = (await store.search(ref, 5)).find((x) => x.ref === ref);
  if (!b) return missing(req);
  const origin = new URL(req.url).origin;

  let mail;
  if (kind === 'received') mail = receivedMail(b);
  else if (kind === 'owner') mail = ownerMail(b, origin);
  else if (kind === 'confirmed') mail = confirmedMail(b);
  else if (kind === 'changed') mail = changedMail(b);
  else if (kind === 'cancelled') mail = cancelledMail(b);
  else if (b.decline) mail = declinedMail(b, b.decline, availability(await store.taken(b.checkIn, b.nights), b.checkIn, b.nights), origin);
  else return missing(req);

  return new Response(mail.html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
