// Bookings in a JSON file under .data/, for trying the whole flow on a developer's machine without
// Supabase. One process only: requests queue behind each other so a check and its save never interleave.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { availability, HOLDING, newRef, nightsOf, totalOf, type Booking, type Taken } from '@/lib/booking/model';
import type { BookingStore } from '@/lib/booking/store';

const FILE = path.join(process.cwd(), '.data', 'bookings.json');

async function load(): Promise<Booking[]> {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function save(all: Booking[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(all, null, 2));
}

function count(all: Booking[], checkIn: string, nights: number): Taken {
  const wanted = new Set(nightsOf(checkIn, nights));
  const taken = {} as Taken;
  for (const b of all) {
    if (!HOLDING.includes(b.status)) continue;
    for (const night of nightsOf(b.checkIn, b.nights)) {
      if (!wanted.has(night)) continue;
      (taken[b.roomId] ??= {})[night] = (taken[b.roomId]?.[night] ?? 0) + 1;
    }
  }
  return taken;
}

let queue: Promise<unknown> = Promise.resolve();
const inTurn = <T>(work: () => Promise<T>) => {
  const run = queue.then(work, work);
  queue = run.catch(() => {});
  return run;
};

export function fileStore(): BookingStore {
  return {
    taken: async (checkIn, nights) => count(await load(), checkIn, nights),
    request: (req) =>
      inTurn(async () => {
        const all = await load();
        const { fullOn } = availability(count(all, req.checkIn, req.nights), req.checkIn, req.nights)[req.roomId];
        if (fullOn.length) return { ok: false as const, fullOn };
        const booking: Booking = { ...req, ref: newRef(), status: 'requested', total: totalOf(req.roomId, req.nights), createdAt: new Date().toISOString() };
        await save([...all, booking]);
        return { ok: true as const, booking };
      }),
  };
}
