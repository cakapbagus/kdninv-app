import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Paths that are always public
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/manifest.webmanifest', 'manifest.json']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths and static assets
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('kdninv_session')?.value

  // No token → redirect to login
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const payload = await verifyToken(token)

  // Invalid/expired token → clear cookie and redirect
  if (!payload) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    response.cookies.delete('kdninv_session')
    return response
  }

  // Authenticated user hitting root or login → go to dashboard
  if (pathname === '/' || pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
