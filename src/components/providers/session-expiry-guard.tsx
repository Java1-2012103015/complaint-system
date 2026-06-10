'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { signOutAndHardNavigate } from '@/lib/sign-out-client'

/** 세션 만료 시 자동 로그아웃 (탭을 열어 둔 채 API 요청 없이 만료되는 경우) */
export function SessionExpiryGuard() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated' || !session?.expires) return

    const expiresAt = new Date(session.expires).getTime()
    const remaining = expiresAt - Date.now()

    if (remaining <= 0) {
      void signOutAndHardNavigate('/login')
      return
    }

    const timer = window.setTimeout(() => {
      void signOutAndHardNavigate('/login')
    }, remaining)

    return () => window.clearTimeout(timer)
  }, [session?.expires, status])

  return null
}
