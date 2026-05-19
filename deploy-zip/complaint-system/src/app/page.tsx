import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { homePathForRole } from '@/lib/home-path-for-role'

/** 비로그인: 공개 현황. 로그인됨: 역할별 워크스페이스(1차는 /dist1/dashboard) */
export default async function RootPage() {
  const session = await getSession()
  if (session) redirect(homePathForRole(session.user.role))
  redirect('/dashboard')
}
