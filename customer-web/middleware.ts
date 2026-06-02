import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/profile', '/my-orders'];

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const path = request.nextUrl.pathname;

  // ── Subdomain routing ─────────────────────────────────────────────────────
  // kitchen.thenookbite.com  →  rewrite to /kitchen/*
  // admin.thenookbite.com    →  rewrite to /admin/*
  //
  // In local dev use:  HOST_OVERRIDE env var isn't needed —
  // just visit localhost:3000/kitchen and localhost:3000/admin directly.

  const isKitchen = host.startsWith('kitchen.');
  const isAdmin   = host.startsWith('admin.');

  if (isKitchen && !path.startsWith('/kitchen')) {
    return NextResponse.rewrite(new URL(`/kitchen${path === '/' ? '' : path}`, request.url));
  }

  if (isAdmin && !path.startsWith('/admin')) {
    return NextResponse.rewrite(new URL(`/admin${path === '/' ? '' : path}`, request.url));
  }

  // ── Auth (customer site only) ─────────────────────────────────────────────
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
