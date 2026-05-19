import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/complaints/status-badge'
import { AdminComplaintsToolbar } from './toolbar'
import { buildAdminComplaintWhere } from '@/lib/admin-complaint-where'
import { AdminComplaintDeleteButton } from '@/components/admin/admin-complaint-delete-button'
import { ClickableTableRow, IsolateRowClick } from '@/components/complaints/clickable-table-row'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Phone, Mail, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ComplaintStatus } from '@prisma/client'

interface PageProps {
  searchParams: {
    page?: string
    status?: string
    search?: string
    showPii?: string
  }
}

export default async function AdminComplaintsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const page = Math.max(1, Number(searchParams.page || 1))
  const limit = 20
  const status = searchParams.status as ComplaintStatus | undefined
  const search = searchParams.search || ''
  const showPii = searchParams.showPii !== 'false'

  const where = buildAdminComplaintWhere({ status, search })

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, receiptNumber: true, title: true, category: true,
        address: true, status: true, scheduledDate: true,
        createdAt: true, updatedAt: true,
        complainantName: true, complainantPhone: true, complainantEmail: true,
        d1: { select: { id: true, name: true, department: true } },
        d2: { select: { id: true, name: true, department: true } },
        _count: { select: { files: true } },
      },
    }),
    prisma.complaint.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <Header title="자율보고 관리" />
      <main className="flex-1 p-6 space-y-4 overflow-auto">
        <AdminComplaintsToolbar total={total} showPii={showPii} />

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">접수번호</th>
                  <th className="px-4 py-3 text-left">제목</th>
                  <th className="px-4 py-3 text-left">유형</th>
                  {showPii && (
                    <>
                      <th className="px-4 py-3 text-left">접수자</th>
                      <th className="px-4 py-3 text-left">연락처</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-left">1차 기관</th>
                  <th className="px-4 py-3 text-left">2차 담당</th>
                  <th className="px-4 py-3 text-left">발생일자</th>
                  <th className="px-4 py-3 text-left">접수일</th>
                  <th className="px-4 py-3 text-center">파일</th>
                  <th className="px-4 py-3 text-center w-14">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={showPii ? 12 : 10} className="py-16 text-center text-gray-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <ClickableTableRow key={item.id} href={`/admin/complaints/${item.id}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.receiptNumber}</td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="font-medium text-gray-800 line-clamp-1 block">
                          {item.title}
                        </span>
                        {item.address && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.address}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.category || '-'}</td>
                      {showPii && (
                        <>
                          <td className="px-4 py-3">
                            <span className="font-medium">{item.complainantName || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            <div className="flex flex-col gap-0.5">
                              {item.complainantPhone && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Phone className="w-3 h-3" />{item.complainantPhone}
                                </span>
                              )}
                              {item.complainantEmail && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Mail className="w-3 h-3" />{item.complainantEmail}
                                </span>
                              )}
                              {!item.complainantPhone && !item.complainantEmail && '-'}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {item.d1 ? (
                          <div>
                            <p className="font-medium">{item.d1.name}</p>
                            {item.d1.department && <p className="text-gray-400">{item.d1.department}</p>}
                          </div>
                        ) : <span className="text-gray-300">미배정</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {item.d2 ? (
                          <div>
                            <p className="font-medium">{item.d2.name}</p>
                            {item.d2.department && <p className="text-gray-400">{item.d2.department}</p>}
                          </div>
                        ) : <span className="text-gray-300">미배정</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.scheduledDate)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        {item._count.files > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Paperclip className="w-3 h-3" />{item._count.files}
                          </span>
                        )}
                      </td>
                      <IsolateRowClick className="px-2 py-2 text-center align-middle">
                        <AdminComplaintDeleteButton
                          compact
                          complaintId={item.id}
                          receiptNumber={item.receiptNumber}
                          title={item.title}
                        />
                      </IsolateRowClick>
                    </ClickableTableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>총 {total.toLocaleString()}건</span>
          <div className="flex items-center gap-1">
            <a
              href={`?page=${Math.max(1, page - 1)}&status=${status || ''}&search=${search}`}
              className={`p-2 rounded-md border ${page <= 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-50'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </a>
            <span className="px-3">{page} / {Math.max(1, totalPages)}</span>
            <a
              href={`?page=${Math.min(totalPages, page + 1)}&status=${status || ''}&search=${search}`}
              className={`p-2 rounded-md border ${page >= totalPages ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-50'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>
    </>
  )
}
