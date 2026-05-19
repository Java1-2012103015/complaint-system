import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ComplaintStatus } from '@prisma/client'
import { formatDateTime } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PublicAllComplaintRow } from './public-all-complaint-row'

export const revalidate = 60

const PAGE_SIZE = 30

const LIST_STATUSES: ComplaintStatus[] = ['PENDING', 'COMPLETED']

function parseListStatus(raw: string | undefined): ComplaintStatus | undefined {
  if (!raw) return undefined
  return LIST_STATUSES.includes(raw as ComplaintStatus) ? (raw as ComplaintStatus) : undefined
}

function listHref(page: number, status?: ComplaintStatus) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (page > 1) params.set('page', String(page))
  const q = params.toString()
  return q ? `/dashboard/all?${q}` : '/dashboard/all'
}

type Props = {
  searchParams: { page?: string; status?: string }
}

export default async function PublicDashboardAllPage({ searchParams }: Props) {
  const session = await getSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const statusFilter = parseListStatus(searchParams.status)
  const where = statusFilter ? { status: statusFilter } : {}

  const rawPage = Math.max(1, Number.parseInt(searchParams.page || '1', 10) || 1)

  const total = await prisma.complaint.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(rawPage, totalPages)
  const skip = (page - 1) * PAGE_SIZE

  const items = await prisma.complaint.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        receiptNumber: true,
        title: true,
        category: true,
        status: true,
        createdAt: true,
      },
    })

  const heading =
    statusFilter === 'PENDING'
      ? '접수대기 자율보고'
      : statusFilter === 'COMPLETED'
        ? '처리완료 자율보고'
        : '전체 자율보고 현황'

  return (
    <main className="w-full py-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{heading}</h2>
        <p className="text-sm text-gray-500 mt-1">
          접수번호·제목·상태만 공개됩니다. 담당 기관·접수자 정보는 표시되지 않습니다. (총 {total.toLocaleString()}건)
          {isAdmin && statusFilter === 'PENDING' && (
            <span className="block sm:inline sm:ml-2 text-blue-700 mt-1 sm:mt-0">
              행을 클릭하면 해당 건의 접수(1차 담당 배정)를 진행할 수 있습니다.
            </span>
          )}
        </p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 font-medium whitespace-nowrap">접수번호</th>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">분류</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap hidden sm:table-cell">접수일시</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    등록된 자율보고가 없습니다.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <PublicAllComplaintRow
                    key={c.id}
                    id={c.id}
                    receiptNumber={c.receiptNumber}
                    title={c.title}
                    category={c.category}
                    status={c.status}
                    createdAtText={formatDateTime(c.createdAt)}
                    adminPendingReceive={isAdmin && statusFilter === 'PENDING'}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-gray-500">
            {page} / {totalPages} 페이지
          </p>
          <div className="flex gap-2">
            <Link
              href={page <= 1 ? '#' : listHref(page - 1, statusFilter)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 ${
                page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'
              }`}
              aria-disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </Link>
            <Link
              href={page >= totalPages ? '#' : listHref(page + 1, statusFilter)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 ${
                page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'
              }`}
              aria-disabled={page >= totalPages}
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
