import { redirect } from 'next/navigation'

/** 예전 URL 호환 — 관리자 홈은 `/dashboard/admin` */
export default function LegacyAdminDashboardRedirect() {
  redirect('/dashboard/admin')
}
