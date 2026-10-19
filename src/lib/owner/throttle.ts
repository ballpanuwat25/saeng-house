// Tries at the owner's door, counted per address so a script cannot try passwords without end. Each try is
// written down before its password is checked, and only then counted, so a burst of tries sent at once
// cannot all slip in under the limit: the sixth one to be written down already sees five before it.
// Five tries from one address within 15 minutes shut the door to it until the oldest is 15 minutes old;
// a right password wipes that address's slate. Behind it sits a ceiling for every address together, so a
// script that fakes a new address on each try (possible off Vercel) still gets only so many guesses.
//
// With Supabase the tries are kept in a table (supabase/migrations/0005_owner_logins.sql), so every server
// instance on Vercel counts the same ones; without it they are kept in this process's memory, which is
// enough on a developer's machine.

export const TRIES = 5;
const ALL_TRIES = 50;
export const WINDOW_MINUTES = 15;
const WINDOW_MS = WINDOW_MINUTES * 60_000;

type Counts = { mine: number; all: number };
type Ledger = { note(ip: string): Promise<Counts>; forgive(ip: string): Promise<void> };

let tries: { ip: string; at: number }[] = [];
const memory: Ledger = {
  async note(ip) {
    tries = [...tries.filter((t) => Date.now() - t.at < WINDOW_MS), { ip, at: Date.now() }];
    return { mine: tries.filter((t) => t.ip === ip).length, all: tries.length };
  },
  async forgive(ip) {
    tries = tries.filter((t) => t.ip !== ip);
  },
};

function supabase(url: string, key: string): Ledger {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const table = `${url}/rest/v1/owner_login_failures`;
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = async (filter: Record<string, string>) => {
    const res = await fetch(`${table}?${new URLSearchParams({ select: 'ip', at: `gte.${since(WINDOW_MS)}`, ...filter })}`, {
      method: 'HEAD', headers: { ...headers, Prefer: 'count=exact' }, cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Supabase counting tries at the owner's door answered ${res.status}`);
    return Number(res.headers.get('content-range')?.split('/')[1] ?? 0);
  };
  return {
    async note(ip) {
      const res = await fetch(table, { method: 'POST', headers, body: JSON.stringify({ ip }), cache: 'no-store' });
      if (!res.ok) throw new Error(`Supabase noting a try at the owner's door answered ${res.status}`);
      // tries older than a day no longer matter to anyone; nobody waits for this
      void fetch(`${table}?at=lt.${since(86_400_000)}`, { method: 'DELETE', headers, cache: 'no-store' }).catch(() => {});
      const [mine, all] = await Promise.all([count({ ip: `eq.${ip}` }), count({})]);
      return { mine, all };
    },
    async forgive(ip) {
      await fetch(`${table}?ip=eq.${encodeURIComponent(ip)}`, { method: 'DELETE', headers, cache: 'no-store' });
    },
  };
}

function ledger(): Ledger {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  return SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? supabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : memory;
}

// Writes this try down and says whether the door is open for it. If the tries cannot be written or read
// (the table not made yet, Supabase down), the door stays open rather than locking the owner out of their
// own book; the failure is logged.
export async function knock(ip: string): Promise<{ open: boolean; lastTry: boolean }> {
  try {
    const { mine, all } = await ledger().note(ip);
    return { open: mine <= TRIES && all <= ALL_TRIES, lastTry: mine >= TRIES || all >= ALL_TRIES };
  } catch (err) {
    console.error(err);
    return { open: true, lastTry: false };
  }
}

export async function forgive(ip: string) {
  try {
    await ledger().forgive(ip);
  } catch (err) {
    console.error(err);
  }
}
