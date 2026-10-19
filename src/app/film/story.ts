// The film's story, plan B: a guest books on the phone while the owner keeps the request book open on the
// desk, the owner confirms, and the guest reads the email. One script for both frames, so the two stay in
// step; the waits are on what the page shows, never on how fast the machine is, so every take plays the
// same way.
import { rooms } from '@/content/site';
import { addDays, bangkokToday } from '@/lib/booking/model';
import { sleep, type Lane } from '@/app/film/lane';

export const GUEST = { name: 'Hana Lindqvist', email: 'hana.lindqvist@example.com' };
// the guest arrives nine nights from today, inside the four weeks the room rack shows
const ARRIVE_IN = 9;

const both = (...lanes: Promise<unknown>[]) => Promise.all(lanes);

// `mark` names the moment the take has reached, for whatever records it to cut or check against
export async function story(desk: Lane, phone: Lane, mark: (scene: string) => void) {
  const today = bangkokToday();
  const arrive = addDays(today, ARRIVE_IN);

  // 1. Opening: both frames on the home page. The cursor walks under the hero's lanterns, so the pointer
  // lamp lights the corridor, and a finger drags across the phone's; then both scroll down together.
  mark('opening');
  await both(
    (async () => {
      await sleep(600);
      await desk.glide(1010, 330, 1500);
      await desk.glide(1240, 250, 1600);
      await desk.glide(880, 420, 1700);
      await desk.glide(1150, 470, 1200);
      await sleep(500);
      await desk.scroll('.arrive', 2600, -72);
      await sleep(1600);
      await desk.scroll('#rooms .rooms-grid', 2600, 0, true);
      await sleep(1800);
    })(),
    (async () => {
      await sleep(1800);
      await phone.drag([[80, 330], [260, 280], [320, 420], [150, 470]], 3600);
      await sleep(900);
      await phone.scroll('.arrive', 2600, -60);
      await sleep(1600);
      await phone.scroll('#rooms', 2600, -60);
      await sleep(1600);
    })(),
  );

  // 2. The guest books on the phone; the owner opens the request book on the desk meanwhile.
  mark('booking');
  let ref = '';
  // how many were waiting before the guest sent theirs; the book's own 15-second check may catch the new
  // request a moment before the owner turns to the window, so the count is read before the guest sends
  let waitingBefore = 0;
  await both(
    (async () => {
      await desk.open('/owner/login');
      await sleep(900);
      await desk.press('.owner-door .btn');
      await desk.see('.owner-tabs');
      waitingBefore = Number((await desk.read('.owner-tab-count'))?.match(/\d+/)?.[0] ?? 0);
      await desk.glide(760, 620);
    })(),
    (async () => {
      await phone.scroll('#book', 2800, -40);
      await sleep(1200);
      await phone.press('#checkin');
      await phone.see('.cal');
      mark('calendar');
      await sleep(900);
      // the calendar opens on the month of the date already on the ticket
      if (arrive.slice(0, 7) !== addDays(today, 7).slice(0, 7)) {
        await phone.press('.cal-head button:last-child');
        await sleep(700);
      }
      await phone.press(`.cal [data-day="${arrive}"]`);
      await sleep(900);
      await phone.press('.step button:last-child');
      await sleep(900);
      // the second kind of room, unless the seeded book has filled it on those nights
      await phone.see('.opt em');
      const room = (await phone.read(`.opt.full input[value="${rooms[1].id}"]`)) === null ? rooms[1].id : rooms[0].id;
      await phone.press(`.opt:has(input[value="${room}"])`);
      await sleep(1100);
      await phone.press('.ticket-stub .btn');
      await sleep(1000);
      await phone.press('#bk-name');
      await phone.type('#bk-name', GUEST.name, 11);
      await sleep(500);
      await phone.press('#bk-email');
      await phone.type('#bk-email', GUEST.email, 23);
      await sleep(900);
      await phone.press('.ticket-stub .btn');
      await phone.see('.ticket .seal');
      mark('sealed');
      ref = ((await phone.read('.ticket-head span:last-child')) ?? '').replace('No. ', '').trim();
      await sleep(2200);
    })(),
  );
  if (!/^SH-/.test(ref)) throw new Error(`the ticket came back without a ref (${ref})`);

  // 3. The owner, on the desk. The owner turns back to the book's window, which makes it ask for new
  // requests at once instead of at its next 15-second check: the count beside Requests goes up and the
  // request joins the foot of the sheet without a reload. Its strip on the Rooms tab carries the paper note;
  // back on Requests, the owner looks at Decline, backs out, and confirms.
  mark('owner');
  const entry = `[id="${ref}"]`;
  const strip = `.strip[data-ref="${ref}"]`;
  await desk.glide(700, 560, 900);
  await desk.ask({ cmd: 'focus' });
  await desk.see('.owner-tab-count', String(waitingBefore + 1));
  await desk.see(entry);
  mark('arrived');
  await sleep(900);
  await desk.hover(`${entry} .entry-name`);
  await sleep(1800);
  await desk.press('.owner-tabs a[href="/owner/rooms"]');
  await desk.see(strip);
  await sleep(1300);
  await desk.hover(strip);
  await desk.see('.slip');
  mark('rack');
  await sleep(2600);
  // the strip itself opens the stay: back on Requests it is brought to the middle and washed red
  await desk.press(strip);
  await desk.see(`${entry}[data-flash]`);
  mark('focused');
  await sleep(1600);
  await desk.hover(`${entry} .entry-name`);
  await sleep(700);
  // the owner opens Decline to show what it asks for (Confirm steps aside while it is open), the reasons
  // the guest's email is worded from, then backs out with "Don't decline" and confirms instead
  await desk.press(`${entry} .decline summary`);
  await desk.see(`${entry} .decline[open] fieldset`);
  mark('declining');
  await sleep(500);
  await desk.hover(`${entry} .decline fieldset label:first-of-type`, 800);
  await sleep(700);
  await desk.hover(`${entry} .decline fieldset label:nth-of-type(2)`, 600);
  await sleep(1500);
  await desk.hover(`${entry} .decline-back`, 700);
  await sleep(400);
  await desk.press(`${entry} .decline-back`);
  await sleep(700);
  await desk.hover(`${entry} .entry-act > form .btn`, 900);
  await sleep(600);
  await desk.press(`${entry} .entry-act > form .btn`);
  await desk.see(`${entry} .entry-act > form .btn`, 'Confirming');
  mark('confirming');
  await desk.see('.owner-note', 'confirmed');
  // the answer comes back to the same tab without moving the page, so the owner scrolls up to its line
  await sleep(700);
  await desk.scroll(0, 1800);
  await desk.hover('.owner-note a', 1000);
  await sleep(1800);

  // 4. Close: the guest reads the confirmation on the phone; the desk turns to the month's figures, then down
  // the month's page to the guest's line, now confirmed.
  mark('close');
  await both(
    phone.open(`/demo/mail/${encodeURIComponent(ref)}/confirmed`, 600),
    (async () => {
      await sleep(900);
      await desk.press('.owner-tabs a[href="/owner/register"]');
      await desk.see('.tally');
      await sleep(600);
      await desk.hover('.tally-head', 1100);
      await sleep(900);
      await desk.scroll(entry, 2400, 0, true);
      mark('kept');
      await desk.hover(`${entry} .entry-name`, 1100);
    })(),
  );
  await sleep(3200);
  return ref;
}
