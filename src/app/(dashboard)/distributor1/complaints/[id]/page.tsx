import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/complaints/status-badge'
import { FilePreview } from '@/components/complaints/file-preview'
import { D1ComplaintActions } from './d1-actions'
import { formatDate, formatDateTime } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import { ArrowLeft, MapPin, Calendar, Mail } from 'lucide-react'
import Link from 'next/link'

interface PageProps { params: { id: string } }

export default async function D1ComplaintDetail({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== 'DISTRIBUTOR_1') redirect('/login')

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: {
      d1: { select: { id: true, name: true, department: true, organizationId: true } },
      d2: { select: { id: true, name: true, department: true, email: true } },
      files: { orderBy: { uploadedAt: 'asc' } },
      histories: {
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true } } },
      },
    },
  })

  if (!complaint || complaint.d1Id !== session.user.id) notFound()

  // 개인정보 제거
  const { complainantName, complainantPhone, complainantEmail, complainantAddr, ...safeComplaint } = complaint

  const showPlanBlock =
    safeComplaint.status === 'COMPLETED' ||
    !!(safeComplaint.actionPlan?.trim() || safeComplaint.plannedStartDate || safeComplaint.plannedEndDate)
  const showResultBlock =
    safeComplaint.status === 'COMPLETED' || !!safeComplaint.resultSummary?.trim()

  return (
    <>
      <Header title="자율보고 상세" />
      <main className="flex-1 p-6 space-y-6 max-w-4xl">
        <div>
          <Link href="/distributor1" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-gray-400 mb-1">{safeComplaint.receiptNumber}</p>
              <h1 className="text-xl font-bold text-gray-900">{safeComplaint.title}</h1>
            </div>
            <StatusBadge status={safeComplaint.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold text-gray-700 mb-3">자율보고 내용</h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{safeComplaint.content}</p>
            </div>

            <div className="bg-white rounded-xl border p-5 grid grid-cols-2 gap-y-3 text-sm">
              {safeComplaint.category && (
                <><span className="text-gray-500">유형</span><span>{safeComplaint.category}</span></>
              )}
              {safeComplaint.address && (
                <><span className="text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />주소</span><span>{safeComplaint.address}</span></>
              )}
              {safeComplaint.scheduledDate && (
                <><span className="text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />발생일자</span><span>{formatDate(safeComplaint.scheduledDate)}</span></>
              )}
              <span className="text-gray-500">접수일</span>
              <span>{formatDateTime(safeComplaint.createdAt)}</span>
            </div>

            {showPlanBlock && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-700 mb-3">처리 계획</h2>
                {safeComplaint.actionPlan?.trim() ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3 leading-relaxed">{safeComplaint.actionPlan}</p>
                ) : safeComplaint.status === 'COMPLETED' ? (
                  <p className="text-sm text-gray-400 mb-3">등록된 처리 계획이 없습니다.</p>
                ) : null}
                {(safeComplaint.plannedStartDate || safeComplaint.plannedEndDate) && (
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    {safeComplaint.plannedStartDate && (
                      <>
                        <span className="text-gray-500">시작 예정</span>
                        <span>{formatDate(safeComplaint.plannedStartDate)}</span>
                      </>
                    )}
                    {safeComplaint.plannedEndDate && (
                      <>
                        <span className="text-gray-500">완료 예정</span>
                        <span>{formatDate(safeComplaint.plannedEndDate)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {showResultBlock && (
              <div
                className={`bg-white rounded-xl border p-5 border-l-4 ${
                  safeComplaint.status === 'COMPLETED' ? 'border-l-green-500' : 'border-l-purple-400'
                }`}
              >
                <h2 className="font-semibold text-gray-700 mb-3 flex flex-wrap items-center gap-2">
                  처리 내용
                  {safeComplaint.status === 'COMPLETED' && (
                    <span className="text-xs font-normal text-green-700 bg-green-50 px-2 py-0.5 rounded-full">처리 완료</span>
                  )}
                  {safeComplaint.status === 'WAITING_APPROVAL' && (
                    <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">승인 대기</span>
                  )}
                </h2>
                {safeComplaint.resultSummary?.trim() ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{safeComplaint.resultSummary}</p>
                ) : safeComplaint.status === 'COMPLETED' ? (
                  <p className="text-sm text-gray-400">등록된 처리 내용이 없습니다.</p>
                ) : null}
                {safeComplaint.status === 'COMPLETED' && safeComplaint.completedAt && (
                  <p className="text-xs text-gray-500 mt-3">처리 완료일: {formatDateTime(safeComplaint.completedAt)}</p>
                )}
              </div>
            )}

            {safeComplaint.files.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-700 mb-3">첨부 파일</h2>
                <div className="space-y-2">
                  {safeComplaint.files.map((f) => <FilePreview key={f.id} file={f} />)}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* 2차 담당 현황 */}
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold text-gray-700 mb-2">2차 담당자</h2>
              {safeComplaint.d2 ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{safeComplaint.d2.name}</p>
                  {safeComplaint.d2.email && (
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Mail className="w-3 h-3 shrink-0" />
                      {safeComplaint.d2.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{safeComplaint.d2.department}</p>
                </div>
              ) : safeComplaint.d2InviteEmail ? (
                <div className="text-sm space-y-1">
                  <p className="text-xs text-amber-700 font-medium">가입 대기 (이메일 배정)</p>
                  <p className="text-xs text-gray-800 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {safeComplaint.d2InviteEmail}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">미배정</p>
              )}
            </div>

            {/* D1 액션 */}
            <D1ComplaintActions complaint={safeComplaint as any} />

            {/* 이력 */}
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold text-gray-700 mb-3">처리 이력</h2>
              <div className="space-y-3">
                {safeComplaint.histories.map((h) => (
                  <div key={h.id} className="text-xs border-l-2 border-gray-200 pl-3 space-y-0.5">
                    <p className="text-gray-400">{formatDateTime(h.createdAt)}</p>
                    <p className="text-gray-700 font-medium">
                      {h.actor?.name || '시스템'} → <span className="text-blue-600">{STATUS_LABELS[h.toStatus]}</span>
                    </p>
                    {h.comment && <p className="text-gray-500 bg-gray-50 rounded p-1.5">{h.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
