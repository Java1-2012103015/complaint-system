'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { UserRowActions } from '@/components/admin/user-row-actions'
import { ROLE_LABELS } from '@/types'
import type { Role } from '@prisma/client'

interface UserTableRowProps {
  user: {
    id: string
    name: string
    email: string
    loginId: string | null
    role: Role
    isTemporary: boolean
    createdAtLabel: string
    orgDeptTeam: string
    complaintCount: number
  }
  currentUserId: string
  d1Count: number
  d2Count: number
}

export function UserTableRow({ user, currentUserId, d1Count, d2Count }: UserTableRowProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>(user.role)
  const [saving, setSaving] = useState(false)

  const isSelf = user.id === currentUserId

  function openEdit() {
    setRole(user.role)
    setOpen(true)
  }

  async function saveRole() {
    if (role === user.role) {
      setOpen(false)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '역할 변경 실패')
      toast({
        title: '역할 변경됨',
        description: `${user.name} 님의 역할을 ${ROLE_LABELS[role]}(으)로 변경했습니다.`,
      })
      setOpen(false)
      router.refresh()
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: e instanceof Error ? e.message : '처리 실패',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={openEdit}
        title="클릭하여 역할 수정"
      >
        <td className="px-4 py-3 font-medium align-top min-w-[10rem]">
          {user.name}
          {user.isTemporary && (
            <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">임시</span>
          )}
        </td>
        <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap align-top">
          {user.loginId || '-'}
        </td>
        <td className="px-4 py-3 text-gray-500 whitespace-nowrap align-top">{user.email}</td>
        <td className="px-4 py-3 whitespace-nowrap align-top w-[8.5rem] min-w-[8.5rem]">
          <span
            className={`inline-flex items-center whitespace-nowrap text-xs px-2.5 py-0.5 rounded-full font-medium ${
              user.role === 'ADMIN'
                ? 'bg-purple-100 text-purple-700'
                : user.role === 'DISTRIBUTOR_1'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {ROLE_LABELS[user.role]}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-500 align-top">{user.orgDeptTeam}</td>
        <td className="px-4 py-3 text-center text-gray-500 whitespace-nowrap align-top">
          {user.complaintCount}
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap align-top">
          {user.createdAtLabel}
        </td>
        <td className="px-4 py-3 whitespace-nowrap align-top text-right" onClick={(e) => e.stopPropagation()}>
          <UserRowActions
            userId={user.id}
            currentUserId={currentUserId}
            name={user.name}
            role={user.role}
            d1Count={d1Count}
            d2Count={d2Count}
          />
        </td>
      </tr>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>사용자 역할 수정</DialogTitle>
            <DialogDescription className="space-y-1 text-left">
              <span className="block font-medium text-gray-900">{user.name}</span>
              <span className="block">{user.email}</span>
              {user.loginId && <span className="block font-mono text-xs">{user.loginId}</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label>역할</Label>
            {isSelf ? (
              <p className="text-sm text-gray-500">
                본인 계정의 역할은 변경할 수 없습니다. (현재: {ROLE_LABELS[user.role]})
              </p>
            ) : (
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">관리자</SelectItem>
                  <SelectItem value="DISTRIBUTOR_1">1차 배분자</SelectItem>
                  <SelectItem value="DISTRIBUTOR_2">2차 담당자</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            {!isSelf && (
              <Button type="button" disabled={saving || role === user.role} onClick={() => void saveRole()}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                저장
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
