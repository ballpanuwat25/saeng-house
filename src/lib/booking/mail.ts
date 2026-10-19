// The emails a guest gets, and the one the owner gets for each new request. With a Resend key they are sent; on a developer's machine without one they are
// written to .data/outbox/ to open in a browser. Laid out like the booking ticket: cream paper, a serif
// for the figures, the red seal.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hotel, rooms } from '@/content/site';
import { checkOutOf, roomOf, type Availability, type Booking, type Decline } from '@/lib/booking/model';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });
const baht = (n: number) => '฿' + n.toLocaleString('en-US');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function ticket(b: Booking, heading: string, lines: string[], after = '') {
  const room = roomOf(b.roomId);
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#7a6455;font-size:13px">${k}</td><td style="padding:6px 0;text-align:right;font-size:15px">${v}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;padding:32px 12px;background:#120b09;font-family:Helvetica,Arial,sans-serif;color:#2a1712">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#efe4d0;border-radius:14px" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 30px">
    <table role="presentation" width="100%"><tr>
      <td style="font-family:Georgia,serif;font-size:24px">${esc(hotel.name)}</td>
      <td style="text-align:right;color:#7a6455;font-size:13px">No. ${b.ref}</td>
    </tr></table>
    <h1 style="margin:22px 0 8px;font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.15">${heading}</h1>
    ${lines.map((l) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.55">${l}</p>`).join('')}
    ${after}
    <table role="presentation" width="100%" style="margin-top:18px;border-top:1px dashed rgba(42,23,18,.35)">
      ${row('Room', esc(room.name))}
      ${row('Arriving', day(b.checkIn))}
      ${row('Leaving', day(checkOutOf(b.checkIn, b.nights)))}
      ${row('Nights', String(b.nights))}
      ${row('Total', `<span style="font-family:Georgia,serif;font-size:24px">${baht(b.total)}</span>`)}
    </table>
    <table role="presentation" width="100%" style="margin-top:22px"><tr>
      <td style="color:#7a6455;font-size:13px;line-height:1.6">${esc(hotel.address[0])}<br>${esc(hotel.address[1])}<br>${esc(hotel.phone)} · LINE ${esc(hotel.line)}</td>
      <td style="text-align:right;vertical-align:bottom"><span style="display:inline-block;width:56px;height:56px;line-height:56px;text-align:center;background:#c4182b;color:#efe4d0;border-radius:6px;font-size:22px;transform:rotate(-9deg)">${esc(hotel.wordmark)}</span></td>
    </tr></table>
  </td></tr></table>
  <p style="max-width:480px;margin:16px auto 0;color:#7a6455;font-size:12px;text-align:center">${esc(hotel.name)} is a fictional hotel made for a portfolio.</p>
</body></html>`;
}

export function receivedMail(b: Booking) {
  const first = b.guest.name.split(' ')[0];
  return {
    subject: `${hotel.name}: request ${b.ref} received`,
    html: ticket(b, `Your room is held, ${esc(first)}.`, [
      `We have your request and are holding the room while we check it. We confirm by email within the hour, usually sooner.`,
      `Nothing is charged now. You pay at the house when you arrive.`,
    ]),
  };
}

export function confirmedMail(b: Booking) {
  const first = b.guest.name.split(' ')[0];
  return {
    subject: `${hotel.name}: booking ${b.ref} confirmed`,
    html: ticket(b, `See you on ${day(b.checkIn)}, ${esc(first)}.`, [
      `Your room is confirmed. Check-in is from 14:00 at the folding doors on Soi Wanit 2, and checkout is by noon.`,
      `Nothing is charged now. You pay at the house when you arrive.`,
      `If your plans change, reply to this email or message us on LINE ${esc(hotel.line)}.`,
    ]),
  };
}

// to the owner, for each request a guest sends from the site: who, what, and a way straight to the answer.
// The request holds a room until it is answered, and the guest was promised an answer within the hour.
export function ownerMail(b: Booking, origin: string) {
  const room = roomOf(b.roomId).name;
  const who = [esc(b.guest.name), `<a href="mailto:${esc(b.guest.email)}" style="color:#2a1712">${esc(b.guest.email)}</a>`, b.guest.contact && esc(b.guest.contact)].filter(Boolean).join('<br>');
  const open = `<p style="margin:20px 0 0"><a href="${esc(origin)}/owner#${b.ref}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#c4182b;color:#fff4ee;font-size:15px;text-decoration:none">Answer in the request book</a></p>`;
  return {
    subject: `New request ${b.ref}: ${room}, ${day(b.checkIn)}, ${b.nights} ${b.nights === 1 ? 'night' : 'nights'}`,
    html: ticket(
      b,
      'A new request is waiting.',
      [`The room is held until you answer. The guest has been told to expect an answer within the hour.`, who, ...(b.note ? [`&ldquo;${esc(b.note)}&rdquo;`] : [])],
      open,
    ),
  };
}

// sent when the owner moves a confirmed stay, at the guest's asking or the house's
export function changedMail(b: Booking) {
  const first = b.guest.name.split(' ')[0];
  return {
    subject: `${hotel.name}: booking ${b.ref} changed`,
    html: ticket(b, `Your stay has changed, ${esc(first)}.`, [
      `Your booking now reads as below, and the room is confirmed for these nights. Check-in is from 14:00 at the folding doors on Soi Wanit 2, and checkout is by noon.`,
      `If this is not what you asked for, reply to this email or message us on LINE ${esc(hotel.line)}.`,
    ]),
  };
}

export function cancelledMail(b: Booking) {
  const first = b.guest.name.split(' ')[0];
  return {
    subject: `${hotel.name}: booking ${b.ref} cancelled`,
    html: ticket(b, `Your stay is cancelled, ${esc(first)}.`, [
      `The room below is no longer held for you. Nothing was charged.`,
      `If this is a surprise, reply to this email or message us on LINE ${esc(hotel.line)}, and we will see what we can do.`,
    ]),
  };
}

const sorry = `We are sorry. Nothing was charged.`;

// `free` is how many rooms of each kind are still free for the same nights, used when the house is full
export function declinedMail(b: Booking, decline: Decline, free: Availability, origin: string) {
  const first = esc(b.guest.name.split(' ')[0]);
  const room = esc(roomOf(b.roomId).name);
  const subject = `${hotel.name}: we cannot take request ${b.ref}`;
  if (decline.reason === 'full') {
    const others = rooms.filter((r) => r.id !== b.roomId && free[r.id].left > 0);
    const offer = others.length
      ? `<p style="margin:18px 0 6px;font-size:15px;line-height:1.55">These rooms are still free for the same nights:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${others
      .map(
        (r) => `<tr><td style="padding:10px 0;border-top:1px solid rgba(42,23,18,.15)"><span style="font-family:Georgia,serif;font-size:19px">${esc(r.name)}</span><br><span style="color:#7a6455;font-size:13px">${baht(r.pricePerNight)} a night, ${baht(r.pricePerNight * b.nights)} for ${b.nights} ${b.nights === 1 ? 'night' : 'nights'}</span></td>
      <td style="padding:10px 0;border-top:1px solid rgba(42,23,18,.15);text-align:right"><a href="${esc(origin)}/#book" style="color:#c4182b;font-size:14px">Book this room</a></td></tr>`,
      )
      .join('')}</table>`
      : `<p style="margin:18px 0 0;font-size:15px;line-height:1.55">Every room in the house is taken for those nights. Another date may still work.</p>`;
    return { subject, html: ticket(b, `We are full ${b.nights === 1 ? 'that night' : 'those nights'}, ${first}.`, [`${room} is taken on the nights you asked for, so we cannot hold it for you. ${sorry}`], offer) };
  }
  const say = {
    unreachable: [`We could not reach you, ${first}.`, `We tried to reach you about your stay and did not hear back, so we have let the room go. ${sorry}`, `If you still want to come, send a new request and we will hold a room again.`],
    repairs: [`${room} is closed for repairs, ${first}.`, `It will not be ready on the nights you asked for, so we cannot hold it for you. ${sorry}`],
    other: [`We cannot take your booking, ${first}.`, esc(decline.note), sorry],
  }[decline.reason];
  return { subject, html: ticket(b, say[0], say.slice(1)) };
}

export async function sendMail(to: string, mail: { subject: string; html: string }, tag: string) {
  const { RESEND_API_KEY, BOOKING_FROM, VERCEL } = process.env;
  if (RESEND_API_KEY && BOOKING_FROM) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: BOOKING_FROM, to, subject: mail.subject, html: mail.html }),
    });
    if (!res.ok) throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
    return;
  }
  if (VERCEL) return;
  const file = path.join(process.cwd(), '.data', 'outbox', `${new Date().toISOString().replace(/[:.]/g, '-')}-${tag}.html`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, mail.html);
}
