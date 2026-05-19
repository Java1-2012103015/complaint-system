import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/complaints/status-badge'
import { ClickableTableRow } from '@/components/complaints/clickable-table-row'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Paperclip } from 'lucide-react'
import type { ComplaintStatus } from '@prisma/client'

/** statuses 생략 시 전체 목록 */
const TAB_STATUSES: { key: string; label: string; statuses?: ComplaintStatus[] }[] = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '진행 중', statuses: ['OFFICER_ASSIGNED', 'IN_PROGRESS_PLAN', 'IN_PROGRESS_SCHED'] },
  { key: 'waiting', label: '승인 대기', statuses: ['WAITING_APPROVAL'] },
  { key: 'done', label: '완료', statuses: ['COMPLETED'] },
]

export default async function Dist2Dashboard() {
  const session = await getSession()
  if (!session || session.user.role !== 'DISTRIBUTOR_2') redirect('/login')

  const userId = session.user.id

  const allComplaints = await prisma.complaint.findMany({
    where: { d2Id: userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, receiptNumber: true, title: true, category: true,
      status: true, scheduledDate: true, plannedEndDate: true,
      createdAt: true, updatedAt: true,
      d1: { select: { name: true, department: true } },
      _count: { select: { files: true } },
    },
  })

  const grouped = Object.fromEntries(
    TAB_STATUSES.map(({ key, statuses }) => [
      key,
      statuses ? allComplaints.filter((c) => statuses.includes(c.status)) : allComplaints,
    ])
  ) as Record<string, typeof allComplaints>

  return (
    <>
      <Header title="내 처리 자율보고" />
      <main className="flex-1 p-6 space-y-5 overflow-auto">
        {/* 요약 */}
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

          {TAB_STATUSES.map(({ key }) => (
            <TabsContent key={key} value={key} className="mt-4">
              {grouped[key].length === 0 ? (
                <div className="bg-white rounded-xl border p-12 text-center text-gray-400 shadow-sm">
                  {key === 'all' ? '배정된 자율보고가 없습니다.' : '해당 상태의 자율보고가 없습니다.'}
                </div>
              ) : (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">접수번호</th>
                          <th className="px-4 py-3 text-left">제목</th>
                          <th className="px-4 py-3 text-left">유형</th>
                          <th className="px-4 py-3 text-left">상태</th>
                          <th className="px-4 py-3 text-left">1차 기관</th>
                          <th className="px-4 py-3 text-left">발생일자</th>
                          <th className="px-4 py-3 text-left">완료 예정</th>
                          <th className="px-4 py-3 text-left">접수일</th>
                          <th className="px-4 py-3 text-center">파일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {grouped[key].map((c) => (
                          <ClickableTableRow key={c.id} href={`/dist2/complaints/${c.id}`}>
                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{c.receiptNumber}</td>
                            <td className="px-4 py-3 max-w-[200px]">
                              <span className="font-medium text-gray-800 line-clamp-1 block">{c.title}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{c.category || '-'}</td>
                            <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {c.d1 ? <><span className="font-medium">{c.d1.name}</span><br /><span className="text-gray-400">{c.d1.department}</span></> : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.scheduledDate)}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.plannedEndDate)}</td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
                            <td className="px-4 py-3 text-center">
                              {c._count.files > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                  <Paperclip className="w-3 h-3" />{c._count.files}
                                </span>
                              )}
                            </td>
                          </ClickableTableRow>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </>
  )
}
