'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RejectModal } from '@/components/admin/reject-modal'
import { RotateCcw, Loader2 } from 'lucide-react'
import type { ComplaintStatus } from '@prisma/client'
import { STATUS_LABELS } from '@/types'

const STATUS_SEQUENCE: ComplaintStatus[] = ['IN_PROGRESS_PLAN', 'IN_PROGRESS_SCHED', 'COMPLETED']

interface D2ComplaintActionsProps {
  complaint: {
    id: string
    status: ComplaintStatus
    resultSummary: string | null
    scheduledDate: Date | null
  }
}

export function D2ComplaintActions({ complaint }: D2ComplaintActionsProps) {
  const router = useRouter()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resultSummary, setResultSummary] = useState(complaint.resultSummary || '')
  const [scheduledDate, setScheduledDate] = useState(
    complaint.scheduledDate ? new Date(complaint.scheduledDate).toISOString().split('T')[0] : ''
  )

  const nextStatuses = STATUS_SEQUENCE.filter((s) => {
    const cur = STATUS_SEQUENCE.indexOf(complaint.status as any)
    const next = STATUS_SEQUENCE.indexOf(s)
    return next >= 0 && (cur < 0 || next === cur + 1)
  })

  const canReject = ['OFFICER_ASSIGNED', 'IN_PROGRESS_PLAN', 'IN_PROGRESS_SCHED'].includes(complaint.status)

  async function handleStatusUpdate(status: ComplaintStatus) {
    setLoading(true)
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resultSummary, scheduledDate }),
      })
      if (!res.ok) throw new Error('상태 변경 실패')
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h2 className="font-semibold text-gray-700">처리 상태 업데이트</h2>

      <div className="space-y-1.5">
        <Label className="text-xs">처리 기간 확정일</Label>
        <Input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">처리 결과 요약</Label>
        <Textarea
          rows={3}
          value={resultSummary}
          onChange={(e) => setResultSummary(e.target.value)}
          placeholder="처리 결과를 입력하세요..."
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        {nextStatuses.map((s) => (
          <Button
            key={s}
            className="w-full"
            variant={s === 'COMPLETED' ? 'default' : 'outline'}
            disabled={loading}
            onClick={() => handleStatusUpdate(s)}
          >
            {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            {STATUS_LABELS[s]}으로 변경
          </Button>
        ))}

        <Button
          variant="outline"
          className="w-full justify-start text-red-600 hover:bg-red-50 border-red-200"
          disabled={!canReject}
          onClick={() => setRejectOpen(true)}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          1차 담당자에게 반려
        </Button>
      </div>

      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        complaintId={complaint.id}
        actorRole="DISTRIBUTOR_2"
      />
    </div>
  )
}
