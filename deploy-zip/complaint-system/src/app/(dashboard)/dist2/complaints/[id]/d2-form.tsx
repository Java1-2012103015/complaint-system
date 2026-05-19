'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { FilePreview } from '@/components/complaints/file-preview'
import {
  Loader2, AlertCircle, Send, RotateCcw, Paperclip, Upload, CheckCircle2,
} from 'lucide-react'
import { formatDate, formatDateTime, formatFileSize } from '@/lib/utils'
import type { ComplaintStatus } from '@prisma/client'

interface Complaint {
  id: string
  status: ComplaintStatus
  actionPlan: string | null
  plannedStartDate: Date | null
  plannedEndDate: Date | null
  resultSummary: string | null
  completedAt: Date | null
}

interface D2ProcessFormProps {
  complaint: Complaint
}

/** 계획 저장(API) 후에만 처리 결과 단계로 진행 가능 */
function hasPersistedProcessingPlan(c: Complaint): boolean {
  if (c.actionPlan?.trim()) return true
  return c.status === 'IN_PROGRESS_PLAN' || c.status === 'IN_PROGRESS_SCHED'
}

export function D2ProcessForm({ complaint }: D2ProcessFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [plan, setPlan] = useState(complaint.actionPlan || '')
  const [startDate, setStartDate] = useState(
    complaint.plannedStartDate ? new Date(complaint.plannedStartDate).toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    complaint.plannedEndDate ? new Date(complaint.plannedEndDate).toISOString().split('T')[0] : ''
  )
  const [result, setResult] = useState(complaint.resultSummary || '')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [planFirstDialogOpen, setPlanFirstDialogOpen] = useState(false)

  const canEdit = !['WAITING_APPROVAL', 'COMPLETED'].includes(complaint.status)
  const planEstablished = hasPersistedProcessingPlan(complaint)
  const planLocked = canEdit && !planEstablished

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFiles((p) => [...p, ...selected])
    e.target.value = ''
  }

  function removeFile(idx: number) {
    setFiles((p) => p.filter((_, i) => i !== idx))
  }

  async function uploadFiles(complaintId: string) {
    if (!files.length) return
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    await fetch(`/api/upload?complaintId=${complaintId}`, { method: 'POST', body: fd })
  }

  // 계획 저장 (IN_PROGRESS_PLAN or IN_PROGRESS_SCHED)
  async function savePlan() {
    if (!plan.trim()) { setError('처리 계획을 입력해 주세요.'); return }
    setLoading(true); setError('')
    try {
      const newStatus = endDate ? 'IN_PROGRESS_SCHED' : 'IN_PROGRESS_PLAN'
      const res = await fetch(`/api/complaints/${complaint.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          actionPlan: plan,
          plannedStartDate: startDate || null,
          plannedEndDate: endDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      await uploadFiles(complaint.id)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // 처리 결과 제출 + 승인 요청
  async function submitResult() {
    if (planLocked) {
      setPlanFirstDialogOpen(true)
      return
    }
    if (!result.trim()) { setError('처리 결과를 입력해 주세요.'); return }
    setLoading(true); setError('')
    try {
      await uploadFiles(complaint.id)
      const res = await fetch(`/api/complaints/${complaint.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'WAITING_APPROVAL',
          resultSummary: result,
          actionPlan: plan || complaint.actionPlan,
          plannedStartDate: startDate || null,
          plannedEndDate: endDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '제출 실패')
      setFiles([])
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (complaint.status === 'COMPLETED') {
    return (
      <div className="bg-white rounded-xl border p-4 shadow-sm space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <CheckCircle2 className="w-7 h-7 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">처리 완료</p>
            {complaint.completedAt && (
              <p className="text-xs text-green-700 mt-1">처리 완료일: {formatDateTime(complaint.completedAt)}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800">처리 계획</h3>
          {complaint.actionPlan?.trim() ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{complaint.actionPlan}</p>
          ) : (
            <p className="text-sm text-gray-400">등록된 처리 계획이 없습니다.</p>
          )}
          {(complaint.plannedStartDate || complaint.plannedEndDate) && (
            <dl className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
              {complaint.plannedStartDate && (
                <>
                  <dt className="text-gray-500">시작 예정</dt>
                  <dd>{formatDate(complaint.plannedStartDate)}</dd>
                </>
              )}
              {complaint.plannedEndDate && (
                <>
                  <dt className="text-gray-500">완료 예정</dt>
                  <dd>{formatDate(complaint.plannedEndDate)}</dd>
                </>
              )}
            </dl>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-800">처리 내용</h3>
          {complaint.resultSummary?.trim() ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{complaint.resultSummary}</p>
          ) : (
            <p className="text-sm text-gray-400">등록된 처리 내용이 없습니다.</p>
          )}
        </div>
      </div>
    )
  }

  if (complaint.status === 'WAITING_APPROVAL') {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-purple-700">승인 대기 중</p>
        <p className="text-xs text-purple-500 mt-1">1차 담당자의 승인을 기다리고 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm space-y-4">
      <h2 className="font-semibold text-gray-700 text-sm">처리 내용 작성</h2>

      {/* 처리 계획 */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">처리 계획</Label>
        <Textarea
          rows={3}
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="조치 계획을 입력하세요..."
          className="text-sm"
          disabled={!canEdit}
        />
      </div>

      {/* 처리 기간 캘린더 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">시작 예정일</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm" disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">완료 예정일</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm" disabled={!canEdit} />
        </div>
      </div>

      {canEdit && (
        <Button
          variant="outline"
          className="w-full text-sm"
          disabled={loading}
          onClick={savePlan}
        >
          {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
          계획 저장
        </Button>
      )}

      {/* 처리 결과 (계획 저장 전에는 입력·증빙·제출/반려 불가) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">처리 결과</Label>
        <div className="relative">
          <Textarea
            rows={4}
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="조치 결과를 입력하세요 (승인 요청 시 필수)..."
            className={`text-sm ${planLocked ? 'bg-gray-50' : ''}`}
            disabled={!canEdit || planLocked}
          />
          {planLocked && (
            <button
              type="button"
              aria-label="처리 계획을 먼저 저장하세요"
              className="absolute inset-0 z-10 cursor-pointer rounded-md"
              onClick={() => setPlanFirstDialogOpen(true)}
            />
          )}
        </div>
      </div>

      {/* 증빙 파일 업로드 */}
      {canEdit && (
        <div className="space-y-2 relative">
          <Label className="text-xs font-medium">증빙 파일 첨부</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={planLocked}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-2" />파일 선택 (이미지, PDF)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFiles}
          />
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-3 h-3 text-gray-400" />
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <span className="text-gray-400">{formatFileSize(f.size)}</span>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 ml-1" disabled={planLocked}>×</button>
                </div>
              ))}
            </div>
          )}
          {planLocked && (
            <button
              type="button"
              aria-label="처리 계획을 먼저 저장하세요"
              className="absolute inset-0 z-10 cursor-pointer rounded-md"
              onClick={() => setPlanFirstDialogOpen(true)}
            />
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </div>
      )}

      {canEdit && (
        <div className="space-y-2 pt-1">
          <Button
            className="w-full text-sm bg-purple-600 hover:bg-purple-700"
            disabled={loading || planLocked || !result.trim()}
            onClick={submitResult}
          >
            {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Send className="mr-2 w-4 h-4" />}
            처리 결과 제출 및 승인 요청
          </Button>
          <Button
            variant="outline"
            className="w-full text-sm text-red-600 hover:bg-red-50 border-red-200"
            disabled={loading}
            onClick={() => setRejectOpen(true)}
          >
            <RotateCcw className="mr-2 w-4 h-4" />
            1차 담당자에게 반려
          </Button>
        </div>
      )}

      <Dialog open={planFirstDialogOpen} onOpenChange={setPlanFirstDialogOpen}>
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-base">처리 계획 필요</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-1">처리계획을 먼저 수립해주세요.</p>
          <DialogFooter>
            <Button type="button" onClick={() => setPlanFirstDialogOpen(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <D2RejectDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        complaintId={complaint.id}
        onSuccess={() => { router.refresh(); setRejectOpen(false) }}
      />
    </div>
  )
}

// ── D2 반려 다이얼로그 ─────────────────────────

function D2RejectDialog({
  open, onClose, complaintId, onSuccess,
}: {
  open: boolean; onClose: () => void; complaintId: string; onSuccess: () => void
}) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!comment.trim()) { setError('반려 의견은 필수입니다.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/complaints/${complaintId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '반려 실패')
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() { setComment(''); setError(''); onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">1차 담당자에게 반려</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-gray-600">본인 소관이 아닌 경우 반려 의견을 작성해 주세요.</p>
          <div className="space-y-1.5">
            <Label>반려 의견 *</Label>
            <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="반려 사유를 입력하세요..." />
          </div>
          {error && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="w-4 h-4" />{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>취소</Button>
          <Button variant="destructive" disabled={loading} onClick={handleSubmit}>
            {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}반려
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
