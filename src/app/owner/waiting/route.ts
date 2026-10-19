// GET /owner/waiting: the number on the Requests tab. The tabs live in the book's layout, which Next.js does
// not render again when the owner moves between tabs, so the tabs ask here instead, on every move and once
// a minute while the book is open.
import { cookies } from 'next/headers';
import { ownerConfig, SESSION_COOKIE, sessionValid } from '@/lib/owner/session';
import { waitingNow } from '@/lib/owner/waiting';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await sessionValid(ownerConfig(), (await cookies()).get(SESSION_COOKIE)?.value))) return new Response(null, { status: 401 });
  return Response.json(await waitingNow());
}
