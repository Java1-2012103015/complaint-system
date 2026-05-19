import { prisma } from '@/lib/prisma'
import { publicSiteTitleFromDb } from '@/lib/public-site-title'
import { PublicHeaderAuth } from '@/components/layout/public-header-auth'
import { PublicDashboardNav } from '@/components/layout/public-dashboard-nav'

export default async function PublicDashboardLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } })
  const siteName = publicSiteTitleFromDb(settings?.siteName)

  return (
    <>
      {/* /public — Next CSS 청크 404 시에도 공개 대시보드만 최소 스타일 유지 */}
      <link rel="stylesheet" href="/dashboard-public.css" />
      <div id="pub-dash-mount" className="min-h-screen bg-gray-50">
      <header
        className="text-white py-10"
        style={{
          background: `linear-gradient(135deg, var(--sys-primary, #2563eb) 0%, var(--sys-accent, #7c3aed) 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6 gap-4">
            <h1 className="text-2xl font-bold">{siteName}</h1>
            <PublicHeaderAuth />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <p className="text-white/80 text-sm">자율보고 접수 및 처리 현황을 실시간으로 확인하세요.</p>
            <PublicDashboardNav />
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="w-full min-w-0">{children}</div>
      </div>
    </div>
    </>
  )
}
