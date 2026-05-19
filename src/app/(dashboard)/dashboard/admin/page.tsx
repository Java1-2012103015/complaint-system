import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getStatusStats } from '@/lib/stats'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/complaints/status-badge'
import { ClickableTableRow } from '@/components/complaints/clickable-table-row'
import { StatusPieChart, ComplaintsBarChart } from '@/components/charts/charts-wrapper'
import { formatDateTime } from '@/lib/utils'
import { FileText, Users, CheckCircle, Clock, AlertTriangle, RotateCcw, Building2 } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardAtDashboardAdmin() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const [statusStats, totalCount, pendingCount, completedCount, waitingApproval, userCount, recentRejections, recentComplaints, organizations] =
    await Promise.all([
      getStatusStats(),
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: 'PENDING' } }),
      prisma.complaint.count({ where: { status: 'COMPLETED' } }),
      prisma.complaint.count({ where: { status: 'WAITING_APPROVAL' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.complaintHistory.findMany({
        where: { actionType: { in: ['REJECT_TO_ADMIN', 'REJECT_TO_D1', 'REJECT_TO_D2'] } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          complaint: { select: { id: true, receiptNumber: true, title: true, status: true } },
          actor: { select: { name: true, department: true } },
        },
      }),
      prisma.complaint.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          receiptNumber: true,
          title: true,
          status: true,
          createdAt: true,
          d1: {
            select: {
              name: true,
              department: true,
              organization: { select: { id: true, name: true } },
            },
          },
          d2: {
            select: {
              name: true,
              organization: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.organization.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          _count: { select: { users: { where: { isActive: true } } } },
        },
      }),
    ])

  const assignedRows = await prisma.complaint.findMany({
    where: { OR: [{ d1Id: { not: null } }, { d2Id: { not: null } }] },
    select: {
      d1: { select: { organizationId: true } },
      d2: { select: { organizationId: true } },
    },
  })

  const orgStats = new Map<string, { d1: number; d2: number }>()
  for (const o of organizations) {
    orgStats.set(o.id, { d1: 0, d2: 0 })
  }
  for (const row of assignedRows) {
    const o1 = row.d1?.organizationId
    if (o1) {
      const cur = orgStats.get(o1)
      if (cur) cur.d1++
    }
    const o2 = row.d2?.organizationId
    if (o2) {
      const cur = orgStats.get(o2)
      if (cur) cur.d2++
    }
  }

  const stats = [
    { label: '전체 자율보고', value: totalCount, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '접수대기', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '승인대기', value: waitingApproval, icon: AlertTriangle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '처리완료', value: completedCount, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '등록 사용자', value: userCount, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <>
      <Header title="관리자 대시보드" />
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* 배정 기관 현황 */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-800">배정 기관 현황</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                등록된 기관별 1차·2차 담당 배정(자율보고) 건수와 소속 활성 사용자 수입니다.
              </p>
            </div>
            <Link href="/admin/organizations" className="ml-auto text-sm text-blue-600 hover:underline shrink-0">
              기관 관리
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">기관명</th>
                  <th className="px-4 py-3 text-right">활성 사용자</th>
                  <th className="px-4 py-3 text-right">1차 배정 건</th>
                  <th className="px-4 py-3 text-right">2차 배정 건</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      등록된 기관이 없습니다. <Link href="/admin/organizations" className="text-blue-600 underline">기관 관리</Link>에서 추가하세요.
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => {
                    const s = orgStats.get(org.id) ?? { d1: 0, d2: 0 }
                    return (
                      <tr key={org.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{org._count.users}</td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{s.d1}</td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{s.d2}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
                <div className={`${s.bg} p-2.5 rounded-lg shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{s.label}</p>
                  <p className="text-xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-2 text-sm">상태별 비율</h2>
            <StatusPieChart data={statusStats} />
          </div>

          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 text-sm">상태별 건수</h2>
            <ComplaintsBarChart data={statusStats} />
          </div>

          <div className="bg-white rounded-xl border shadow-sm flex flex-col">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-gray-800 text-sm">최근 반려 알림</h2>
            </div>
            <div className="flex-1 divide-y overflow-y-auto max-h-64">
              {recentRejections.length === 0 ? (
                <p className="py-6 text-center text-gray-400 text-sm">반려된 자율보고 없음</p>
              ) : (
                recentRejections.map((h) => (
                  <Link
                    key={h.id}
                    href={`/admin/complaints/${h.complaint?.id}`}
                    className="block px-5 py-3 hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-gray-400">{h.complaint?.receiptNumber}</span>
                      <span className="text-xs text-red-500 font-medium">반려</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{h.complaint?.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {h.actor?.name}
                      {h.actor?.department ? ` (${h.actor.department})` : ''} · {formatDateTime(h.createdAt)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">최근 접수 자율보고</h2>
            <Link href="/admin/complaints" className="text-sm text-blue-600 hover:underline">
              전체 보기
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">접수번호</th>
                  <th className="px-4 py-3 text-left">제목</th>
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-left">1차 기관</th>
                  <th className="px-4 py-3 text-left">1차 담당</th>
                  <th className="px-4 py-3 text-left">2차 기관</th>
                  <th className="px-4 py-3 text-left">2차 담당</th>
                  <th className="px-4 py-3 text-left">접수일</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentComplaints.map((c) => (
                  <ClickableTableRow key={c.id} href={`/admin/complaints/${c.id}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{c.receiptNumber}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="font-medium text-gray-800 line-clamp-1 block">{c.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[140px]">
                      {c.d1?.organization?.name ? (
                        <span className="font-medium line-clamp-2">{c.d1.organization.name}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {c.d1 ? (
                        <>
                          <span className="font-medium">{c.d1.name}</span>
                          {c.d1.department && <span className="text-gray-400"> ({c.d1.department})</span>}
                        </>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[140px]">
                      {c.d2?.organization?.name ? (
                        <span className="font-medium line-clamp-2">{c.d2.organization.name}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.d2?.name || <span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
                  </ClickableTableRow>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
