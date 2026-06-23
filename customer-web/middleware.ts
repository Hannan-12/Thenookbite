import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const path = request.nextUrl.pathname;

  if (host.startsWith('kitchen.') && !path.startsWith('/kitchen')) {
    return NextResponse.rewrite(new URL(`/kitchen${path === '/' ? '' : path}`, request.url));
  }
  if (host.startsWith('admin.') && !path.startsWith('/admin')) {
    return NextResponse.rewrite(new URL(`/admin${path === '/' ? '' : path}`, request.url));
  }
  if (host.startsWith('checkin.') && !path.startsWith('/checkin')) {
    return NextResponse.rewrite(new URL('/checkin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
