import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/complaints/status-badge'
import { FilePreview } from '@/components/complaints/file-preview'
import { ComplaintActions } from './complaint-actions'
import { formatDate, formatDateTime } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import { ArrowLeft, MapPin, Calendar, User, Phone, Mail } from 'lucide-react'
import Link from 'next/link'

interface PageProps { params: { id: string } }

export default async function AdminComplaintDetail({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: {
      d1: { include: { organization: { select: { name: true } } } },
      d2: { include: { organization: { select: { name: true } } } },
      d1InviteOrganization: { select: { name: true } },
      files: { orderBy: { uploadedAt: 'asc' } },
      histories: {
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true } } },
      },
    },
  })

  if (!complaint) notFound()

  const showPlanBlock =
    complaint.status === 'COMPLETED' ||
    !!(complaint.actionPlan?.trim() || complaint.plannedStartDate || complaint.plannedEndDate)
  const showResultBlock =
    complaint.status === 'COMPLETED' || !!complaint.resultSummary?.trim()

  return (
    <>
      <Header title={`자율보고 상세`} />
      <main className="flex-1 p-6 space-y-6 max-w-5xl">
        {/* 뒤로가기 + 헤더 */}
        <div>
          <Link href="/admin/complaints" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-gray-400 mb-1">{complaint.receiptNumber}</p>
              <h1 className="text-xl font-bold text-gray-900">{complaint.title}</h1>
            </div>
            <StatusBadge status={complaint.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌: 자율보고 본문 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold text-gray-700 mb-3">자율보고 내용</h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{complaint.content}</p>
            </div>

            {/* 메타 정보 */}
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-gray-700 mb-1">기본 정보</h2>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                {complaint.category && (
                  <>
                    <span className="text-gray-500">유형</span>
                    <span>{complaint.category}</span>
                  </>
                )}
                {complaint.address && (
                  <>
                    <span className="text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />주소</span>
                    <span>{complaint.address}</span>
                  </>
                )}
                {complaint.scheduledDate && (
                  <>
                    <span className="text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />발생일자</span>
                    <span>{formatDate(complaint.scheduledDate)}</span>
                  </>
                )}
                <span className="text-gray-500">접수일</span>
                <span>{formatDateTime(complaint.createdAt)}</span>
              </div>
            </div>

            {/* 처리 계획 · 처리 내용 (완료 건 포함 조회) */}
            {showPlanBlock && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-700 mb-3">처리 계획</h2>
                {complaint.actionPlan?.trim() ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3 leading-relaxed">{complaint.actionPlan}</p>
                ) : complaint.status === 'COMPLETED' ? (
                  <p className="text-sm text-gray-400 mb-3">등록된 처리 계획이 없습니다.</p>
                ) : null}
                {(complaint.plannedStartDate || complaint.plannedEndDate) && (
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    {complaint.plannedStartDate && (
                      <>
                        <span className="text-gray-500">시작 예정</span>
                        <span>{formatDate(complaint.plannedStartDate)}</span>
                      </>
                    )}
                    {complaint.plannedEndDate && (
                      <>
                        <span className="text-gray-500">완료 예정</span>
                        <span>{formatDate(complaint.plannedEndDate)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {showResultBlock && (
              <div
                className={`bg-white rounded-xl border p-5 border-l-4 ${
                  complaint.status === 'COMPLETED' ? 'border-l-green-500' : 'border-l-purple-400'
                }`}
              >
                <h2 className="font-semibold text-gray-700 mb-3 flex flex-wrap items-center gap-2">
                  처리 내용
                  {complaint.status === 'COMPLETED' && (
                    <span className="text-xs font-normal text-green-700 bg-green-50 px-2 py-0.5 rounded-full">처리 완료</span>
                  )}
                  {complaint.status === 'WAITING_APPROVAL' && (
                    <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">승인 대기</span>
                  )}
                </h2>
                {complaint.resultSummary?.trim() ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{complaint.resultSummary}</p>
                ) : complaint.status === 'COMPLETED' ? (
                  <p className="text-sm text-gray-400">등록된 처리 내용이 없습니다.</p>
                ) : null}
                {complaint.status === 'COMPLETED' && complaint.completedAt && (
                  <p className="text-xs text-gray-500 mt-3">처리 완료일: {formatDateTime(complaint.completedAt)}</p>
                )}
              </div>
            )}

            {/* 접수자 정보 (관리자 전용) */}
            {(complaint.complainantName || complaint.complainantPhone) && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-700 mb-3">접수자 정보</h2>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {complaint.complainantName && (
                    <>
                      <span className="text-gray-500 flex items-center gap-1"><User className="w-3.5 h-3.5" />성명</span>
                      <span>{complaint.complainantName}</span>
                    </>
                  )}
                  {complaint.complainantPhone && (
                    <>
                      <span className="text-gray-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />연락처</span>
                      <span>{complaint.complainantPhone}</span>
                    </>
                  )}
                  {complaint.complainantEmail && (
                    <>
                      <span className="text-gray-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5" />이메일</span>
                      <span>{complaint.complainantEmail}</span>
                    </>
                  )}
                  {complaint.complainantAddr && (
                    <>
                      <span className="text-gray-500">주소</span>
                      <span>{complaint.complainantAddr}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 첨부 파일 */}
            {complaint.files.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-700 mb-3">첨부 파일</h2>
                <div className="space-y-2">
                  {complaint.files.map((f) => (
                    <FilePreview key={f.id} file={f} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 우: 배분 상태 + 액션 + 이력 */}
          <div className="space-y-4">
            {/* 배분 현황 */}
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h2 className="font-semibold text-gray-700">배분 현황</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">1차 담당 (기관)</p>
                  {complaint.d1 ? (
                    <div>
                      <p className="font-medium">{complaint.d1.name}</p>
                      {complaint.d1.email && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          {complaint.d1.email}
                        </p>
                      )}
                      {complaint.d1.organization?.name && (
                        <p className="text-xs text-gray-500">{complaint.d1.organization.name}</p>
                      )}
                      {complaint.d1.department && (
                        <p className="text-xs text-gray-500">{complaint.d1.department}</p>
                      )}
                    </div>
                  ) : complaint.d1InviteEmail ? (
                    <div>
                      <p className="text-xs text-amber-700 font-medium">가입 대기 (이메일 배정)</p>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        {complaint.d1InviteEmail}
                      </p>
                      {complaint.d1InviteOrganization?.name && (
                        <p className="text-xs text-gray-500">{complaint.d1InviteOrganization.name}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">미배정</p>
                  )}
                </div>
                <hr />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">2차 담당 (실무)</p>
                  {complaint.d2 ? (
                    <div>
                      <p className="font-medium">{complaint.d2.name}</p>
                      {complaint.d2.email && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          {complaint.d2.email}
                        </p>
                      )}
                      {complaint.d2.organization?.name && (
                        <p className="text-xs text-gray-500">{complaint.d2.organization.name}</p>
                      )}
                      {complaint.d2.department && (
                        <p className="text-xs text-gray-500">{complaint.d2.department}</p>
                      )}
                    </div>
                  ) : complaint.d2InviteEmail ? (
                    <div>
                      <p className="text-xs text-amber-700 font-medium">가입 대기 (이메일 배정)</p>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        {complaint.d2InviteEmail}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400">미배정</p>
                  )}
                </div>
              </div>
            </div>

            {/* 관리자 액션 버튼 (useSearchParams → Suspense) */}
            <Suspense fallback={<div className="bg-white rounded-xl border p-4 min-h-[120px]" />}>
              <ComplaintActions complaint={complaint} />
            </Suspense>

            {/* 처리 이력 */}
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold text-gray-700 mb-3">처리 이력</h2>
              <div className="space-y-3">
                {complaint.histories.map((h) => (
                  <div key={h.id} className="text-xs border-l-2 border-gray-200 pl-3 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{formatDateTime(h.createdAt)}</span>
                    </div>
                    {h.comment ? (
                      <>
                        <p className="text-gray-800 font-medium">{h.comment}</p>
                        <p className="text-gray-500">
                          {h.actor?.name || '시스템'} ·{' '}
                          <span className="text-blue-600">{STATUS_LABELS[h.toStatus]}</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-700 font-medium">
                        {h.actor?.name || '시스템'} →{' '}
                        <span className="text-blue-600">{STATUS_LABELS[h.toStatus]}</span>
                      </p>
                    )}
                  </div>
                ))}
                {complaint.histories.length === 0 && (
                  <p className="text-xs text-gray-400">이력 없음</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
