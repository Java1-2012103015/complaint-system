import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

function isPublicDashboardPath(pathname: string) {
  if (pathname === '/dashboard') return true
  if (pathname === '/dashboard/all') return true
  if (pathname.startsWith('/dashboard/all/')) return true
  return false
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    if (!token) {
      if (isPublicDashboardPath(pathname)) {
        if (pathname === '/dashboard') {
          return NextResponse.redirect(new URL('/dashboard/all', req.url))
        }
        return NextResponse.next()
      }
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const role = token.role as string

    // 관리자 전용
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // 관리자 대시보드 (/dashboard/admin)
    if (pathname.startsWith('/dashboard/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // 1차 배분자 전용 (/dist1)
    if (pathname.startsWith('/dist1') && role !== 'DISTRIBUTOR_1' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // 2차 배분자 전용 (/dist2)
    if (pathname.startsWith('/dist2') && role !== 'DISTRIBUTOR_2' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        if (isPublicDashboardPath(pathname)) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/dist1/:path*',
    '/dist2/:path*',
    '/dashboard',
    '/dashboard/all',
    '/dashboard/admin',
    '/dashboard/admin/:path*',
  ],
}
