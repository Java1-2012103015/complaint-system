'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RejectModalProps {
  open: boolean
  onClose: () => void
  complaintId: string
  /** D1이 반려하면 → 관리자, D2가 반려하면 → 1차 */
  actorRole: 'DISTRIBUTOR_1' | 'DISTRIBUTOR_2'
}

export function RejectModal({ open, onClose, complaintId, actorRole }: RejectModalProps) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const targetLabel = actorRole === 'DISTRIBUTOR_1' ? '관리자' : '1차 담당자'

  async function handleSubmit() {
    if (!comment.trim()) {
      setError('반려 의견을 입력해 주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/complaints/${complaintId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '반려 처리 실패')
      router.refresh()
      handleClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setComment('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">자율보고 반려 — {targetLabel}에게</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-gray-600">
            이 자율보고를 <strong>{targetLabel}</strong>에게 반려합니다. 반려 의견은 필수입니다.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="comment">반려 의견 *</Label>
            <Textarea
              id="comment"
              rows={4}
              placeholder="반려 사유를 입력하세요..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
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
            {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            반려 처리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
