import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// These paths never require auth
const PUBLIC = ['/login', '/menu'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Check cookie (set by login page alongside localStorage)
  const token = request.cookies.get('pos_token')?.value;
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Only run on app routes — skip static files, api, _next
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
