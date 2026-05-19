import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/complaints/status-badge'
import { FilePreview } from '@/components/complaints/file-preview'
import { D2ProcessForm } from './d2-form'
import { formatDate, formatDateTime } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import { ArrowLeft, MapPin, Calendar, Paperclip } from 'lucide-react'
import Link from 'next/link'

interface PageProps { params: { id: string } }

export default async function Dist2ComplaintDetail({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== 'DISTRIBUTOR_2') redirect('/login')

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: {
      d1: { select: { id: true, name: true, department: true, email: true, phone: true, role: true, isTemporary: true } },
      d2: { select: { id: true, name: true, department: true, email: true, phone: true, role: true, isTemporary: true } },
      files: { orderBy: { uploadedAt: 'asc' } },
      histories: {
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true } } },
      },
    },
  })

  if (!complaint || complaint.d2Id !== session.user.id) notFound()

  const {
    complainantName, complainantPhone, complainantEmail, complainantAddr,
    ...safe
  } = complaint

  // 파일을 증빙 파일과 일반 파일로 분리 (모두 동일하게 처리)
  return (
    <>
      <Header title="자율보고 처리" />
      <main className="flex-1 p-6 space-y-5 max-w-5xl overflow-auto">
        {/* 헤더 */}
        <div>
          <Link href="/dist2/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
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
          {/* 좌: 자율보고 정보 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">자율보고 내용</h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{safe.content}</p>
            </div>

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

            {/* 첨부 파일 (자율보고 접수 시 첨부) */}
            {safe.files.length > 0 && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />자율보고 첨부 파일 ({safe.files.length})
                </h2>
                <div className="space-y-2">
                  {safe.files.map((f) => <FilePreview key={f.id} file={f} />)}
                </div>
              </div>
            )}

            {/* 반려 이력 (최근) */}
            {safe.histories.some((h) => h.actionType === 'REJECT_TO_D2') && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h2 className="font-semibold text-red-700 mb-3 text-sm">반려 의견</h2>
                {safe.histories
                  .filter((h) => h.actionType === 'REJECT_TO_D2')
                  .slice(0, 2)
                  .map((h) => (
                    <div key={h.id} className="mb-3 last:mb-0">
                      <p className="text-xs text-red-400 mb-1">{h.actor?.name} · {formatDateTime(h.createdAt)}</p>
                      <p className="text-sm text-red-700 bg-white/60 rounded p-2.5">{h.comment}</p>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* 우: 처리 폼 + 이력 */}
          <div className="space-y-4">
            {/* D2 처리 폼 */}
            <D2ProcessForm complaint={safe as any} />

            {/* 처리 이력 */}
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">처리 이력</h2>
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {safe.histories.map((h) => (
                  <div key={h.id} className="text-xs border-l-2 border-gray-200 pl-3 space-y-0.5">
                    <p className="text-gray-400">{formatDateTime(h.createdAt)}</p>
                    <p className="text-gray-700 font-medium">
                      {h.actor?.name || '시스템'} → <span className="text-blue-600">{STATUS_LABELS[h.toStatus]}</span>
                    </p>
                    {h.comment && (
                      <p className="text-gray-500 bg-gray-50 rounded p-1.5">{h.comment}</p>
                    )}
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
