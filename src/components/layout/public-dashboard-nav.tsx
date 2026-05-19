'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

/** 공개 대시보드 하위 경로 간 이동 (비로그인은 요약 경로로 가면 /dashboard → /all 리다이렉트됨) */
export function PublicDashboardNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  if (status === 'loading') return null

  const linkClass = 'text-white/90 hover:text-white underline underline-offset-2'

  return (
    <nav className="flex flex-wrap gap-4 text-sm justify-end" aria-label="공개 현황 하위 메뉴">
      {pathname === '/dashboard' && (
        <Link href="/dashboard/all" className={linkClass}>
          전체 자율보고 목록
        </Link>
      )}
      {pathname.startsWith('/dashboard/all') && session && (
        <Link href="/dashboard" className={linkClass}>
          요약 대시보드
        </Link>
      )}
    </nav>
  )
}
