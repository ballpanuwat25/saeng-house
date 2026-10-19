// The room rack behind the Rooms tab: the chart old front desks kept on the wall, a line for each room and
// a column for each night, with a strip of paper for each stay. Guests book a kind of room, not a numbered
// room, so the rack deals the stays of each kind onto that kind's lines itself.
import { rooms } from '@/content/site';
import { addDays, checkOutOf, type Booking, type RoomId } from '@/lib/booking/model';

export type Strip = { b: Booking; line: number; start: number; span: number; before: boolean; after: boolean };
export type Shelf = { id: RoomId; lines: number; strips: Strip[]; full: string[] };

const DAY = 864e5;
const gap = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

// Each stay goes on the first line free by its arrival, taking stays in order of arrival. That never needs
// more lines than the most rooms held on any one night, and the booking store never lets that pass the
// number of rooms, so every stay finds a line. A stay is cut at the edges of the window; `before` and
// `after` say it carries on past them.
export function rack(stays: Booking[], from: string, nights: number): Shelf[] {
  const until = addDays(from, nights);
  return rooms.map((r) => {
    const free: string[] = []; // for each line, the morning it is next free
    const strips: Strip[] = [];
    const held: Record<string, number> = {};
    const mine = stays.filter((b) => b.roomId === r.id).sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.createdAt.localeCompare(b.createdAt));
    for (const b of mine) {
      const out = checkOutOf(b.checkIn, b.nights);
      let line = free.findIndex((morning) => morning <= b.checkIn);
      if (line < 0) line = free.push(out) - 1;
      else free[line] = out;
      const first = b.checkIn < from ? from : b.checkIn;
      const last = out > until ? until : out;
      strips.push({ b, line, start: gap(from, first), span: gap(first, last), before: b.checkIn < from, after: out > until });
      for (let d = first; d < last; d = addDays(d, 1)) held[d] = (held[d] ?? 0) + 1;
    }
    const full = Object.keys(held).filter((d) => held[d] >= r.count).sort();
    return { id: r.id, lines: Math.max(r.count, free.length), strips, full };
  });
}
