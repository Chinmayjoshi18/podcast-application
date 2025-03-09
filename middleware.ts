import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/record',
  '/messages',
  '/settings',
];

// List of routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/login',
  '/signup',
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Get the current path from the URL
  const path = req.nextUrl.pathname;
  
  // Refresh session if available
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check if the path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  
  // Check if the path is an auth route (login/signup)
  const isAuthRoute = authRoutes.some(route => path === route);

  // Handle auth routes when already logged in
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // Handle protected routes when not logged in
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

// Only run middleware on the following paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 