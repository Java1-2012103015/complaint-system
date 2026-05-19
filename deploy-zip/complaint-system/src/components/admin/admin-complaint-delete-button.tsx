'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface AdminComplaintDeleteButtonProps {
  complaintId: string
  receiptNumber: string
  title: string
  /** 목록에서만 compact 버튼 */
  compact?: boolean
}

export function AdminComplaintDeleteButton({
  complaintId,
  receiptNumber,
  title,
  compact,
}: AdminComplaintDeleteButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '삭제 실패')
      toast({ title: '삭제됨', description: `${receiptNumber} 자율보고를 삭제했습니다.` })
      setOpen(false)
      router.refresh()
      if (!compact) {
        router.push('/admin/complaints')
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: e instanceof Error ? e.message : '삭제 실패',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'sm' : 'default'}
        className={
          compact
            ? 'h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
            : 'text-red-600 border-red-200 hover:bg-red-50'
        }
        onClick={() => setOpen(true)}
        title="자율보고 삭제"
      >
        <Trash2 className={compact ? 'w-4 h-4' : 'w-4 h-4 mr-2'} />
        {!compact && '삭제'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자율보고 삭제</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-gray-700">
                <p>
                  <span className="font-mono text-gray-600">{receiptNumber}</span>
                </p>
                <p className="font-medium text-gray-900 line-clamp-2">{title}</p>
                <p className="text-amber-800 bg-amber-50 border border-amber-100 rounded-md p-2">
                  첨부·이력·알림 로그 등 연관 데이터가 함께 삭제됩니다. 되돌릴 수 없습니다.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="button" variant="destructive" disabled={loading} onClick={() => void handleDelete()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
