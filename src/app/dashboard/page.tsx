import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getStatusStats } from '@/lib/stats'
import { StatusPieChart, ComplaintsBarChart } from '@/components/charts/charts-wrapper'
import { StatusBadge } from '@/components/complaints/status-badge'
import { formatDateTime } from '@/lib/utils'
import { BarChart3, FileText, CheckCircle, Clock } from 'lucide-react'

export const revalidate = 60

export default async function PublicDashboard() {
  const [statusStats, totalCount, completedCount, pendingCount, recentComplaints] = await Promise.all([
      getStatusStats(),
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: 'COMPLETED' } }),
      prisma.complaint.count({ where: { status: 'PENDING' } }),
      // 공개 - 기관명·담당자 정보 제외, 신상정보 제외
      prisma.complaint.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          receiptNumber: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

  const statCards = [
    { label: '전체 자율보고', value: totalCount, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', href: '/dashboard/all' as const },
    { label: '접수대기', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', href: '/dashboard/all?status=PENDING' as const },
    { label: '처리완료', value: completedCount, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', href: '/dashboard/all?status=COMPLETED' as const },
    { label: '처리율', value: `${totalCount ? Math.round((completedCount / totalCount) * 100) : 0}%`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', href: undefined },
  ]

  return (
    <main className="w-full py-8 space-y-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon
            const inner = (
              <>
                <div className={`${s.bg} p-3 rounded-lg shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                  </p>
                </div>
              </>
            )
            if (s.href) {
              return (
                <Link
                  key={s.label}
                  href={s.href}
                  className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm hover:border-gray-300 hover:bg-gray-50/80 transition-colors cursor-pointer"
                >
                  {inner}
                </Link>
              )
            }
            return (
              <div key={s.label} className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm">
                {inner}
              </div>
            )
          })}
        </div>

        {/* 차트 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              상태별 현황 (도넛)
            </h2>
            <StatusPieChart data={statusStats} />
          </div>
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              상태별 현황 (막대)
            </h2>
            <ComplaintsBarChart data={statusStats} />
          </div>
        </div>

        {/* 최근 자율보고 (기관명·담당자 없이) */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-800">최근 접수 자율보고</h2>
            <p className="text-xs text-gray-400 mt-0.5">담당 기관 및 접수자 정보는 공개되지 않습니다.</p>
          </div>
          <div className="divide-y">
            {recentComplaints.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-6 py-3.5">
                <span className="font-mono text-xs text-gray-400 w-36 shrink-0">{c.receiptNumber}</span>
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{c.title}</span>
                {c.category && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {c.category}
                  </span>
                )}
                <StatusBadge status={c.status} />
                <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">{formatDateTime(c.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
    </main>
  )
}
