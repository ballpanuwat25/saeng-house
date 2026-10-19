// Keeps the owner's back office behind the login. Server actions post to the page they live on, so this
// covers Confirm and Decline as well as the pages.
import { NextResponse, type NextRequest } from 'next/server';
import { ownerConfig, SESSION_COOKIE, sessionValid } from '@/lib/owner/session';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/owner/login') return NextResponse.next();
  if (await sessionValid(ownerConfig(), req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL('/owner/login', req.url));
}

export const config = { matcher: ['/owner', '/owner/:path*'] };
