'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { LogIn, LogOut } from 'lucide-react'
import { signOutAndHardNavigate } from '@/lib/sign-out-client'

/** 공개 페이지 헤더: 비로그인은 로그인 링크, 로그인 중에는 이름 + 로그아웃 */
export function PublicHeaderAuth() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="h-9 w-24 rounded-full bg-white/10 animate-pulse" aria-hidden />
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <span className="text-sm text-white/95 max-w-[200px] truncate" title={session.user.name}>
          {session.user.name}
        </span>
        <button
          type="button"
          onClick={() => void signOutAndHardNavigate('/dashboard/all')}
          className="inline-flex items-center gap-2 text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors"
    >
      <LogIn className="w-4 h-4" />
      담당자 로그인
    </Link>
  )
}
