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
import { Loader2, Trash2, UserX } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import type { Role } from '@prisma/client'

interface UserRowActionsProps {
  userId: string
  currentUserId: string
  name: string
  role: Role
  d1Count: number
  d2Count: number
}

export function UserRowActions({ userId, currentUserId, name, role, d1Count, d2Count }: UserRowActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'soft' | 'hard' | null>(null)
  const [confirmHard, setConfirmHard] = useState(false)

  if (userId === currentUserId) {
    return <span className="text-xs text-gray-400">본인</span>
  }

  async function deactivate() {
    setLoading('soft')
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '비활성화 실패')
      toast({ title: '비활성화됨', description: `${name} 계정을 비활성화했습니다.` })
      router.refresh()
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: e instanceof Error ? e.message : '처리 실패',
      })
    } finally {
      setLoading(null)
    }
  }

  async function removeHard() {
    setLoading('hard')
    try {
      const res = await fetch(`/api/users/${userId}?hard=1`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '삭제 실패')
      toast({ title: '삭제됨', description: `${name} 계정을 영구 삭제했습니다.` })
      setConfirmHard(false)
      router.refresh()
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: e instanceof Error ? e.message : '처리 실패',
      })
    } finally {
      setLoading(null)
    }
  }

  const assignHint =
    d1Count + d2Count > 0
      ? `담당 자율보고 ${d1Count + d2Count}건의 배정이 해제됩니다.`
      : '담당 배정이 없습니다.'

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={loading !== null}
          onClick={() => void deactivate()}
        >
          {loading === 'soft' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5 mr-1" />}
          비활성
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
          disabled={loading !== null}
          onClick={() => setConfirmHard(true)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          삭제
        </Button>
      </div>

      <Dialog open={confirmHard} onOpenChange={setConfirmHard}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>계정 영구 삭제</DialogTitle>
            <DialogDescription className="space-y-2 text-left">
              <span className="block font-medium text-gray-900">{name}</span>
              <span className="block text-sm">
                역할: {role === 'ADMIN' ? '관리자' : role === 'DISTRIBUTOR_1' ? '1차 배분자' : '2차 담당자'}
              </span>
              <span className="block text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-md p-2">
                {assignHint} 이 작업은 되돌릴 수 없습니다.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmHard(false)}>
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading !== null}
              onClick={() => void removeHard()}
            >
              {loading === 'hard' ? <Loader2 className="w-4 h-4 animate-spin" /> : '영구 삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
