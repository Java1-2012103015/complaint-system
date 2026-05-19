'use client'

import { signOut } from 'next-auth/react'

/** POST 로그아웃 후 전체 페이지 이동 — 클라이언트 청크/세션 캐시와 무관하게 쿠키 반영 */
export async function signOutAndHardNavigate(callbackPath: string) {
  if (typeof window === 'undefined') return
  const path = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`
  const callbackUrl = `${window.location.origin}${path}`
  try {
    await signOut({ redirect: false, callbackUrl })
  } catch {
    // fetch/JSON 오류 시에도 아래에서 이동
  }
  window.location.assign(path)
}
