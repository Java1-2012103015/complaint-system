import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { formatDateTime } from '@/lib/utils'

const EVENT_LABEL: Record<string, string> = {
  ASSIGNED_D1: '1차 배분',
  ASSIGNED_D2: '2차 배분',
  REJECTED_TO_ADMIN: '관리자 반려',
  REJECTED_TO_D1: '1차 반려',
  APPROVAL_REQUESTED: '승인 요청',
  APPROVED: '승인 완료',
  REJECTED_TO_D2: '2차 반려',
  STATUS_CHANGED: '상태 변경',
  ACCOUNT_CREATED: '계정 생성',
  COMPLETED: '처리 완료',
}

export default async function AdminMessagesPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const rows = await prisma.notification.findMany({
    take: 100,
    orderBy: { sentAt: 'desc' },
    select: {
      id: true,
      type: true,
      event: true,
      recipient: true,
      message: true,
      success: true,
      errorMessage: true,
      sentAt: true,
      complaint: { select: { receiptNumber: true } },
    },
  })

  return (
    <>
      <Header title="메시지 관리" />
      <main className="flex-1 p-6 space-y-4 overflow-auto">
        <p className="text-sm text-gray-500">
          SMS·이메일 발송 로그입니다. (최근 100건)
        </p>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-600">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">발송일시</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">유형</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">이벤트</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">접수번호</th>
                  <th className="px-4 py-3 font-medium">수신</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">결과</th>
                  <th className="px-4 py-3 font-medium min-w-[200px]">메시지</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                      발송 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/80 align-top">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(r.sentAt)}</td>
                      <td className="px-4 py-3">{r.type === 'SMS' ? 'SMS' : '이메일'}</td>
                      <td className="px-4 py-3">{EVENT_LABEL[r.event] ?? r.event}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.complaint?.receiptNumber ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[180px] truncate" title={r.recipient}>
                        {r.recipient}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.success ? (
                          <span className="text-green-600">성공</span>
                        ) : (
                          <span className="text-red-600" title={r.errorMessage ?? ''}>
                            실패
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-md line-clamp-2" title={r.message}>
                        {r.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
