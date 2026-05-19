'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { AssignModal } from '@/components/admin/assign-modal'
import {
  UserCheck, RotateCcw, CheckCircle2, XCircle, Loader2, AlertCircle,
} from 'lucide-react'
import type { ComplaintStatus } from '@prisma/client'

interface D1ActionsProps {
  complaint: {
    id: string
    status: ComplaintStatus
    d1Id: string | null
    d2Id: string | null
    resultSummary: string | null
    d1?: { organizationId: string | null } | null
    d1InviteOrganizationId?: string | null
  }
}

export function D1Actions({ complaint }: D1ActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [assignOpen, setAssignOpen] = useState(false)
  const [rejectAdminOpen, setRejectAdminOpen] = useState(false)
  const [rejectD2Open, setRejectD2Open] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)

  const canAssignD2 = ['PENDING', 'AGENCY_ASSIGNED', 'OFFICER_ASSIGNED'].includes(complaint.status)
  const canRejectToAdmin = complaint.status !== 'COMPLETED'

  useEffect(() => {
    if (searchParams.get('assign') !== '2') return
    if (canAssignD2) setAssignOpen(true)
    router.replace(pathname, { scroll: false })
  }, [searchParams, pathname, router, canAssignD2])
  const canApprove = complaint.status === 'WAITING_APPROVAL'
  const canRejectD2 = complaint.status === 'WAITING_APPROVAL'

  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm space-y-2">
      <h2 className="font-semibold text-gray-700 text-sm mb-1">액션</h2>

      {/* 2차 배정 */}
      <Button
        variant="outline"
        className="w-full justify-start text-sm"
        disabled={!canAssignD2}
        onClick={() => setAssignOpen(true)}
      >
        <UserCheck className="w-4 h-4 mr-2 text-blue-500" />
        2차 담당자 배정
      </Button>

      {/* 결과 승인 */}
      {canApprove && (
        <Button
          className="w-full justify-start text-sm bg-green-600 hover:bg-green-700"
          onClick={() => setApproveOpen(true)}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          처리 결과 승인 → 완료
        </Button>
      )}

      {/* 2차에게 반려 */}
      <Button
        variant="outline"
        className="w-full justify-start text-sm text-orange-600 hover:bg-orange-50 border-orange-200"
        disabled={!canRejectD2}
        onClick={() => setRejectD2Open(true)}
      >
        <XCircle className="w-4 h-4 mr-2" />
        2차 담당자에게 반려
      </Button>

      {/* 관리자에게 반려 */}
      <Button
        variant="outline"
        className="w-full justify-start text-sm text-red-600 hover:bg-red-50 border-red-200"
        disabled={!canRejectToAdmin}
        onClick={() => setRejectAdminOpen(true)}
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        관리자에게 반려
      </Button>

      {/* 모달들 */}
      <AssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        complaintId={complaint.id}
        level={2}
        d2OrganizationId={complaint.d1?.organizationId ?? complaint.d1InviteOrganizationId ?? null}
      />

      <ApproveDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        complaintId={complaint.id}
        onSuccess={() => { router.refresh(); setApproveOpen(false) }}
      />

      <RejectDialog
        open={rejectAdminOpen}
        onClose={() => setRejectAdminOpen(false)}
        complaintId={complaint.id}
        target="admin"
        title="관리자에게 반려"
        onSuccess={() => { router.refresh(); setRejectAdminOpen(false) }}
      />

      <RejectDialog
        open={rejectD2Open}
        onClose={() => setRejectD2Open(false)}
        complaintId={complaint.id}
        target="d2"
        title="2차 담당자에게 반려"
        onSuccess={() => { router.refresh(); setRejectD2Open(false) }}
      />
    </div>
  )
}

// ── 승인 다이얼로그 ─────────────────────────────

function ApproveDialog({
  open, onClose, complaintId, onSuccess,
}: {
  open: boolean; onClose: () => void; complaintId: string; onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleApprove() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/complaints/${complaintId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '승인 실패')
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-700">처리 결과 승인</DialogTitle>
        </DialogHeader>
        <div className="py-3 text-sm text-gray-600 space-y-2">
          <p>2차 담당자가 제출한 처리 결과를 최종 승인합니다.</p>
          <p>승인 시 자율보고 상태가 <strong>처리완료</strong>로 변경됩니다.</p>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button className="bg-green-600 hover:bg-green-700" disabled={loading} onClick={handleApprove}>
            {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            승인 완료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 반려 다이얼로그 (공용) ──────────────────────

function RejectDialog({
  open, onClose, complaintId, target, title, onSuccess,
}: {
  open: boolean; onClose: () => void; complaintId: string
  target: 'admin' | 'd2'; title: string; onSuccess: () => void
}) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!comment.trim()) { setError('반려 의견은 필수입니다.'); return }
    setLoading(true); setError('')
    try {
      const endpoint = target === 'admin'
        ? `/api/complaints/${complaintId}/reject`
        : `/api/complaints/${complaintId}/approve`
      const body = target === 'admin'
        ? { comment }
        : { action: 'reject', comment }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '처리 실패')
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
          <DialogTitle className="text-red-600">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-gray-600">반려 의견을 작성해 주세요. (필수)</p>
          <div className="space-y-1.5">
            <Label>반려 의견 *</Label>
            <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="반려 사유를 입력하세요..." />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
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
