// Tries at a door, counted per address, so a script cannot knock without end. Two doors use it: the owner's
// login, and in the public demo (src/lib/demo.ts) the booking ticket, so one visitor cannot fill every room.
// Each try is written down before it is let through, and only then counted, so a burst of tries sent at
// once cannot all slip in under the limit: the try past the limit already sees the others before it.
// Behind the limit for one address sits a ceiling for every address together, so a script that fakes a new
// address on each try (possible off Vercel) still gets only so many.
//
// With Supabase the tries are kept in a table (supabase/migrations/0005_owner_logins.sql; each row's ip is
// written as "door:address"), so every server instance on Vercel counts the same ones; without it they are
// kept in this process's memory, which is enough on a developer's machine.

type Door = { name: string; perAddress: number; everyone: number; minutes: number };

// five passwords from one address in 15 minutes; a right password wipes that address's slate
export const LOGIN: Door = { name: 'login', perAddress: 5, everyone: 50, minutes: 15 };
// the demo's ticket: ten requests from one address in an hour, two hundred from everyone
export const BOOKING: Door = { name: 'book', perAddress: 10, everyone: 200, minutes: 60 };

type Counts = { mine: number; all: number };
type Ledger = { note(door: Door, ip: string): Promise<Counts>; forgive(door: Door, ip: string): Promise<void> };

const key = (door: Door, ip: string) => `${door.name}:${ip}`;

let tries: { key: string; door: string; at: number }[] = [];
const memory: Ledger = {
  async note(door, ip) {
    const now = Date.now();
    tries = [...tries.filter((t) => now - t.at < 86_400_000), { key: key(door, ip), door: door.name, at: now }];
    const recent = tries.filter((t) => t.door === door.name && now - t.at < door.minutes * 60_000);
    return { mine: recent.filter((t) => t.key === key(door, ip)).length, all: recent.length };
  },
  async forgive(door, ip) {
    tries = tries.filter((t) => t.key !== key(door, ip));
  },
};

function supabase(url: string, secret: string): Ledger {
  const headers = { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
  const table = `${url}/rest/v1/owner_login_failures`;
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = async (door: Door, ip: string) => {
    const filter = new URLSearchParams({ select: 'ip', at: `gte.${since(door.minutes * 60_000)}`, ip: ip ? `eq.${key(door, ip)}` : `like.${door.name}:*` });
    const res = await fetch(`${table}?${filter}`, { method: 'HEAD', headers: { ...headers, Prefer: 'count=exact' }, cache: 'no-store' });
    if (!res.ok) throw new Error(`Supabase counting tries at the ${door.name} door answered ${res.status}`);
    return Number(res.headers.get('content-range')?.split('/')[1] ?? 0);
  };
  return {
    async note(door, ip) {
      const res = await fetch(table, { method: 'POST', headers, body: JSON.stringify({ ip: key(door, ip) }), cache: 'no-store' });
      if (!res.ok) throw new Error(`Supabase noting a try at the ${door.name} door answered ${res.status}`);
      // tries older than a day no longer matter to anyone; nobody waits for this
      void fetch(`${table}?at=lt.${since(86_400_000)}`, { method: 'DELETE', headers, cache: 'no-store' }).catch(() => {});
      const [mine, all] = await Promise.all([count(door, ip), count(door, '')]);
      return { mine, all };
    },
    async forgive(door, ip) {
      await fetch(`${table}?ip=eq.${encodeURIComponent(key(door, ip))}`, { method: 'DELETE', headers, cache: 'no-store' });
    },
  };
}

function ledger(): Ledger {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  return SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? supabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : memory;
}

// Writes this try down and says whether the door is open for it, and whether it is the last one let
// through. If the tries cannot be written or read (the table not made yet, Supabase down), the door stays
// open rather than locking the owner out of their own book; the failure is logged.
export async function knock(door: Door, ip: string): Promise<{ open: boolean; lastTry: boolean }> {
  try {
    const { mine, all } = await ledger().note(door, ip);
    return { open: mine <= door.perAddress && all <= door.everyone, lastTry: mine >= door.perAddress || all >= door.everyone };
  } catch (err) {
    console.error(err);
    return { open: true, lastTry: false };
  }
}

export async function forgive(door: Door, ip: string) {
  try {
    await ledger().forgive(door, ip);
  } catch (err) {
    console.error(err);
  }
}

// The address a request came from. On Vercel x-vercel-forwarded-for is set by the platform and cannot be
// sent by the visitor; the other two are only as trustworthy as the proxy in front, which is why each door
// also keeps a ceiling across every address.
export const clientIp = (h: Headers) =>
  (h.get('x-vercel-forwarded-for') ?? h.get('x-real-ip') ?? h.get('x-forwarded-for'))?.split(',')[0].trim() || 'unknown';
