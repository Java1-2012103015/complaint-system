import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/complaints/status-badge'
import { ClickableTableRow } from '@/components/complaints/clickable-table-row'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import type { ComplaintStatus } from '@prisma/client'

const D1_ACTIVE_NOT: ComplaintStatus[] = ['WAITING_APPROVAL', 'COMPLETED']

/** statuses 생략 시 전체 목록 (2차 대시보드와 동일 패턴) */
const TAB_STATUSES: {
  key: string
  label: string
  filter?: (s: ComplaintStatus) => boolean
}[] = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '진행 중', filter: (s) => !D1_ACTIVE_NOT.includes(s) },
  { key: 'waiting', label: '승인 대기', filter: (s) => s === 'WAITING_APPROVAL' },
  { key: 'done', label: '완료', filter: (s) => s === 'COMPLETED' },
]

export default async function Dist1Dashboard() {
  const session = await getSession()
  if (!session || session.user.role !== 'DISTRIBUTOR_1') redirect('/login')

  const userId = session.user.id

  const [allComplaints, recentComplaints] = await Promise.all([
    prisma.complaint.findMany({
      where: { d1Id: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        receiptNumber: true,
        title: true,
        category: true,
        status: true,
        scheduledDate: true,
        plannedEndDate: true,
        createdAt: true,
        updatedAt: true,
        resultSummary: true,
        d2: { select: { name: true, department: true } },
        _count: { select: { files: true } },
      },
    }),
    prisma.complaint.findMany({
      where: { d1Id: userId },
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

  const grouped = Object.fromEntries(
    TAB_STATUSES.map(({ key, filter }) => [
      key,
      filter ? allComplaints.filter((c) => filter(c.status)) : allComplaints,
    ])
  ) as Record<string, typeof allComplaints>

  return (
    <>
      <Header title="내 담당 자율보고" />
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* 최근 접수 — 상단, 클릭 시 2차 배정 화면으로 */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-800">최근 접수 자율보고</h2>
            <p className="text-xs text-gray-400 mt-0.5">담당 기관 및 접수자 정보는 공개되지 않습니다.</p>
          </div>
          {recentComplaints.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">담당 자율보고가 없습니다.</div>
          ) : (
            <div className="divide-y">
              {recentComplaints.map((c) => (
                <Link
                  key={c.id}
                  href={`/dist1/complaints/${c.id}?assign=2`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="font-mono text-xs text-gray-400 w-36 shrink-0">{c.receiptNumber}</span>
                  <span className="flex-1 text-sm font-medium text-gray-800 truncate">{c.title}</span>
                  {c.category && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                      {c.category}
                    </span>
                  )}
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">
                    {formatDateTime(c.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 요약 (2차 대시보드와 동일: 전체 / 진행 중 / 승인 대기 / 완료) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TAB_STATUSES.map(({ key, label }) => (
            <div key={key} className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold mt-0.5">{grouped[key].length}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="all">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {TAB_STATUSES.map(({ key, label }) => (
              <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                {label}
                {grouped[key].length > 0 && (
                  <span
                    className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      key === 'waiting'
                        ? 'bg-purple-500 text-white'
                        : key === 'done'
                          ? 'bg-green-600 text-white'
                          : key === 'all'
                            ? 'bg-slate-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {grouped[key].length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ComplaintListTable
              items={grouped.all}
              basePath="/dist1/complaints"
              emptyMessage="배정된 자율보고가 없습니다."
            />
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <ComplaintListTable
              items={grouped.active}
              basePath="/dist1/complaints"
              emptyMessage="진행 중인 담당 자율보고가 없습니다."
            />
          </TabsContent>

          <TabsContent value="waiting" className="mt-4">
            {grouped.waiting.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400 shadow-sm">
                승인 대기 중인 자율보고가 없습니다.
              </div>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-purple-50 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">접수번호</th>
                        <th className="px-4 py-3 text-left">제목</th>
                        <th className="px-4 py-3 text-left">2차 담당</th>
                        <th className="px-4 py-3 text-left">처리 결과 요약</th>
                        <th className="px-4 py-3 text-left">제출일</th>
                        <th className="px-4 py-3 text-left">파일</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {grouped.waiting.map((c) => (
                        <ClickableTableRow
                          key={c.id}
                          href={`/dist1/complaints/${c.id}`}
                          className="hover:bg-purple-50"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">{c.receiptNumber}</td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <span className="font-medium text-gray-800 line-clamp-1 block">{c.title}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {c.d2 ? <><span className="font-medium">{c.d2.name}</span><br /><span className="text-gray-400">{c.d2.department}</span></> : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px]">
                            <p className="line-clamp-2">{c.resultSummary || '-'}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(c.updatedAt)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{c._count.files > 0 ? `${c._count.files}건` : '-'}</td>
                        </ClickableTableRow>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="done" className="mt-4">
            <ComplaintListTable
              items={grouped.done}
              basePath="/dist1/complaints"
              emptyMessage="처리 완료된 자율보고가 없습니다."
            />
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}

function ComplaintListTable({ items, basePath, emptyMessage }: {
  items: Array<{
    id: string; receiptNumber: string; title: string; category: string | null
    status: ComplaintStatus; scheduledDate: Date | null; plannedEndDate?: Date | null
    createdAt: Date; d2?: { name: string; department: string | null } | null
    _count: { files: number }
  }>
  basePath: string
  emptyMessage: string
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center text-gray-400 shadow-sm">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">접수번호</th>
              <th className="px-4 py-3 text-left">제목</th>
              <th className="px-4 py-3 text-left">유형</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">2차 담당</th>
              <th className="px-4 py-3 text-left">발생일자</th>
              <th className="px-4 py-3 text-left">접수일</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((c) => (
              <ClickableTableRow key={c.id} href={`${basePath}/${c.id}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{c.receiptNumber}</td>
                <td className="px-4 py-3 max-w-[200px]">
                  <span className="font-medium text-gray-800 line-clamp-1 block">{c.title}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.category || '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {c.d2 ? <><span className="font-medium">{c.d2.name}</span></> : <span className="text-gray-300">미배정</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.scheduledDate)}</td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
              </ClickableTableRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
