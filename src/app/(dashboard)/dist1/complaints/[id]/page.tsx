import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/complaints/status-badge'
import { FilePreview } from '@/components/complaints/file-preview'
import { D1Actions } from './d1-actions'
import { formatDate, formatDateTime } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import { ArrowLeft, MapPin, Calendar, User, Paperclip, Mail } from 'lucide-react'
import Link from 'next/link'

interface PageProps { params: { id: string } }

export default async function Dist1ComplaintDetail({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== 'DISTRIBUTOR_1') redirect('/login')

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: {
      d1: { select: { id: true, name: true, department: true, email: true, phone: true, role: true, isTemporary: true, organizationId: true } },
      d2: { select: { id: true, name: true, department: true, email: true, phone: true, role: true, isTemporary: true } },
      files: { orderBy: { uploadedAt: 'asc' } },
      histories: {
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true } } },
      },
    },
  })

  if (!complaint || complaint.d1Id !== session.user.id) notFound()

  // PII 완전 제거
  const {
    complainantName, complainantPhone, complainantEmail, complainantAddr,
    ...safe
  } = complaint

  const showPlanBlock =
    safe.status === 'COMPLETED' ||
    !!(safe.actionPlan?.trim() || safe.plannedStartDate || safe.plannedEndDate)
  const showResultBlock = safe.status === 'COMPLETED' || !!safe.resultSummary?.trim()

  return (
    <>
      <Header title="자율보고 상세" />
      <main className="flex-1 p-6 space-y-5 max-w-5xl overflow-auto">
        {/* 헤더 */}
        <div>
          <Link href="/dist1/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
            <ArrowLeft className="w-4 h-4" />목록으로
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-gray-400 mb-1">{safe.receiptNumber}</p>
              <h1 className="text-xl font-bold text-gray-900">{safe.title}</h1>
            </div>
            <StatusBadge status={safe.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 좌: 자율보고 본문 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 내용 */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">자율보고 내용</h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{safe.content}</p>
            </div>

            {/* 기본 정보 */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">기본 정보</h2>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                {safe.category && (<><dt className="text-gray-500">유형</dt><dd>{safe.category}</dd></>)}
                {safe.address && (
                  <><dt className="text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />주소</dt><dd>{safe.address}</dd></>
                )}
                {safe.scheduledDate && (
                  <><dt className="text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />발생일자</dt><dd>{formatDate(safe.scheduledDate)}</dd></>
                )}
                <><dt className="text-gray-500">접수일</dt><dd>{formatDateTime(safe.createdAt)}</dd></>
              </dl>
            </div>

            {/* 처리 계획 */}
            {showPlanBlock && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-semibold text-gray-700 mb-3 text-sm">처리 계획</h2>
                {safe.actionPlan?.trim() ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3 leading-relaxed">{safe.actionPlan}</p>
                ) : safe.status === 'COMPLETED' ? (
                  <p className="text-sm text-gray-400 mb-3">등록된 처리 계획이 없습니다.</p>
                ) : null}
                {(safe.plannedStartDate || safe.plannedEndDate) && (
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    {safe.plannedStartDate && (<><dt className="text-gray-500">시작 예정</dt><dd>{formatDate(safe.plannedStartDate)}</dd></>)}
                    {safe.plannedEndDate && (<><dt className="text-gray-500">완료 예정</dt><dd>{formatDate(safe.plannedEndDate)}</dd></>)}
                  </dl>
                )}
              </div>
            )}

            {/* 처리 내용 (D2 제출) */}
            {showResultBlock && (
              <div
                className={`bg-white rounded-xl border p-5 shadow-sm border-l-4 ${
                  safe.status === 'COMPLETED' ? 'border-l-green-500' : 'border-l-purple-400'
                }`}
              >
                <h2 className="font-semibold text-gray-700 mb-3 text-sm flex flex-wrap items-center gap-2">
                  처리 내용
                  {safe.status === 'COMPLETED' && (
                    <span className="text-xs font-normal text-green-700 bg-green-50 px-2 py-0.5 rounded-full">처리 완료</span>
                  )}
                  {safe.status === 'WAITING_APPROVAL' && (
                    <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">승인 대기</span>
                  )}
                </h2>
                {safe.resultSummary?.trim() ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{safe.resultSummary}</p>
                ) : safe.status === 'COMPLETED' ? (
                  <p className="text-sm text-gray-400">등록된 처리 내용이 없습니다.</p>
                ) : null}
                {safe.status === 'COMPLETED' && safe.completedAt && (
                  <p className="text-xs text-gray-500 mt-3">처리 완료일: {formatDateTime(safe.completedAt)}</p>
                )}
              </div>
            )}

            {/* 첨부 파일 */}
            {safe.files.length > 0 && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />첨부 파일 ({safe.files.length})
                </h2>
                <div className="space-y-2">
                  {safe.files.map((f) => <FilePreview key={f.id} file={f} />)}
                </div>
              </div>
            )}
          </div>

          {/* 우: 사이드바 */}
          <div className="space-y-4">
            {/* 2차 담당 현황 */}
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">2차 담당자</h2>
              {safe.d2 ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{safe.d2.name}</p>
                  {safe.d2.email && (
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Mail className="w-3 h-3 shrink-0" />
                      {safe.d2.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{safe.d2.department}</p>
                </div>
              ) : safe.d2InviteEmail ? (
                <div className="text-sm space-y-1">
                  <p className="text-xs text-amber-700 font-medium">가입 대기 (이메일 배정)</p>
                  <p className="text-xs text-gray-800 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {safe.d2InviteEmail}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">미배정</p>
              )}
            </div>

            {/* D1 액션 버튼 (useSearchParams → Suspense) */}
            <Suspense fallback={<div className="bg-white rounded-xl border p-4 shadow-sm min-h-[120px]" />}>
              <D1Actions complaint={safe as any} />
            </Suspense>

            {/* 처리 이력 */}
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">처리 이력</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {safe.histories.map((h) => (
                  <div key={h.id} className="text-xs border-l-2 border-gray-200 pl-3 space-y-0.5">
                    <p className="text-gray-400">{formatDateTime(h.createdAt)}</p>
                    <p className="text-gray-700 font-medium">
                      {h.actor?.name || '시스템'} → <span className="text-blue-600">{STATUS_LABELS[h.toStatus]}</span>
                    </p>
                    {h.comment && (
                      <p className="text-gray-500 bg-gray-50 rounded p-1.5 whitespace-pre-wrap">{h.comment}</p>
                    )}
                  </div>
                ))}
                {safe.histories.length === 0 && <p className="text-gray-400">이력 없음</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
