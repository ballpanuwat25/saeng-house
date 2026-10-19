// Wrong passwords at the owner's door, counted per address, so a script cannot try passwords without end.
// Five wrong tries from one address within 15 minutes shut the door to it until the oldest of them is 15
// minutes old. With Supabase the tries are kept in a table (supabase/migrations/0005_owner_logins.sql), so
// every server instance on Vercel counts the same tries; without it they are kept in this process's memory,
// which is enough on a developer's machine.

export const TRIES = 5;
export const WINDOW_MINUTES = 15;
const WINDOW_MS = WINDOW_MINUTES * 60_000;

type Throttle = { wrongTries(ip: string): Promise<number>; noteWrong(ip: string): Promise<void> };

const tries = new Map<string, number[]>();
const memory: Throttle = {
  async wrongTries(ip) {
    const recent = (tries.get(ip) ?? []).filter((t) => Date.now() - t < WINDOW_MS);
    tries.set(ip, recent);
    return recent.length;
  },
  async noteWrong(ip) {
    tries.set(ip, [...(tries.get(ip) ?? []), Date.now()]);
  },
};

function supabase(url: string, key: string): Throttle {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  return {
    async wrongTries(ip) {
      const filter = new URLSearchParams({ select: 'ip', ip: `eq.${ip}`, at: `gte.${since(WINDOW_MS)}` });
      const res = await fetch(`${url}/rest/v1/owner_login_failures?${filter}`, { method: 'HEAD', headers: { ...headers, Prefer: 'count=exact' }, cache: 'no-store' });
      if (!res.ok) throw new Error(`Supabase counting wrong tries answered ${res.status}`);
      return Number(res.headers.get('content-range')?.split('/')[1] ?? 0);
    },
    async noteWrong(ip) {
      const res = await fetch(`${url}/rest/v1/owner_login_failures`, { method: 'POST', headers, body: JSON.stringify({ ip }), cache: 'no-store' });
      if (!res.ok) throw new Error(`Supabase noting a wrong try answered ${res.status}`);
      // tries older than a day no longer matter to anyone
      await fetch(`${url}/rest/v1/owner_login_failures?at=lt.${since(86_400_000)}`, { method: 'DELETE', headers, cache: 'no-store' });
    },
  };
}

function throttle(): Throttle {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  return SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? supabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : memory;
}

// If the count cannot be read (the table not made yet, Supabase down) the door stays open rather than
// locking the owner out of their own book; the failure is logged.
export async function isShut(ip: string) {
  try {
    return (await throttle().wrongTries(ip)) >= TRIES;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function noteWrongTry(ip: string) {
  try {
    await throttle().noteWrong(ip);
  } catch (err) {
    console.error(err);
  }
}
