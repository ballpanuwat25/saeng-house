// The owner's login. One password, from OWNER_PASSWORD; a successful login gets a cookie holding its expiry
// signed with OWNER_SESSION_SECRET, so the server can trust it without keeping sessions anywhere. Uses only
// Web Crypto, because the middleware that checks the cookie runs on the edge runtime.

export const SESSION_COOKIE = 'owner_session';
export const SESSION_DAYS = 14;

// printed in the README; only ever used on a developer's machine
const DEV_PASSWORD = 'saeng-dev';
const DEV_SECRET = 'saeng-house-dev-session-secret';

type OwnerConfig = { password: string; secret: string } | null;

// on a deployed site both must be set, or the back office stays shut rather than falling back to a known password
export function ownerConfig(): OwnerConfig {
  const { OWNER_PASSWORD, OWNER_SESSION_SECRET, VERCEL } = process.env;
  if (OWNER_PASSWORD && OWNER_SESSION_SECRET) return { password: OWNER_PASSWORD, secret: OWNER_SESSION_SECRET };
  return VERCEL ? null : { password: OWNER_PASSWORD || DEV_PASSWORD, secret: OWNER_SESSION_SECRET || DEV_SECRET };
}

const bytes = (s: string) => new TextEncoder().encode(s);

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', bytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, bytes(message)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// compares two strings in time that does not depend on where they first differ
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// hashing both sides first hides the password's length from the comparison too
export async function passwordMatches(config: NonNullable<OwnerConfig>, tried: string) {
  return same(await hmac(config.secret, tried), await hmac(config.secret, config.password));
}

export async function newSession(config: NonNullable<OwnerConfig>) {
  const expires = String(Date.now() + SESSION_DAYS * 864e5);
  return `${expires}.${await hmac(config.secret, expires)}`;
}

export async function sessionValid(config: OwnerConfig, cookie: string | undefined) {
  if (!config || !cookie) return false;
  const [expires, sig] = cookie.split('.');
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  return same(sig, await hmac(config.secret, expires));
}
