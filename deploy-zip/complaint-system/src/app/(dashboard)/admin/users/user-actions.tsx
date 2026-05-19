'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, UserPlus, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { OrgSearchCombobox } from '@/components/orgs/org-search-combobox'
import { LoginIdAvailabilityField } from '@/components/auth/login-id-availability-field'

interface CreateProps { mode: 'create' }
interface ApproveProps { mode: 'approve'; userId: string; userName: string }
type UserManagementActionsProps = CreateProps | ApproveProps

export function UserManagementActions(props: UserManagementActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loginIdVerified, setLoginIdVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    loginId: '',
    email: '',
    password: '',
    role: 'DISTRIBUTOR_1',
    organizationId: null as string | null,
    organizationName: '',
    department: '',
    team: '',
  })

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!loginIdVerified) {
      setError('아이디 중복확인을 완료해 주세요.')
      return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          loginId: form.loginId.trim(),
          email: form.email,
          role: form.role,
          organizationId: form.organizationId || undefined,
          department: form.department.trim() || undefined,
          team: form.team.trim() || undefined,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성 실패')
      router.refresh()
      setOpen(false)
      setForm({
        name: '', loginId: '', email: '', password: '', role: 'DISTRIBUTOR_1',
        organizationId: null, organizationName: '', department: '', team: '',
      })
      setLoginIdVerified(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (props.mode !== 'approve') return
    setLoading(true)
    try {
      await fetch(`/api/users/${props.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDeny() {
    if (props.mode !== 'approve') return
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${props.userId}?hard=1`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '거절 처리 실패')
      }
      router.refresh()
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '거절 실패',
        description: e instanceof Error ? e.message : '처리 실패',
      })
    } finally {
      setLoading(false)
    }
  }

  if (props.mode === 'approve') {
    return (
      <div className="flex gap-2 justify-center">
        <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={loading} onClick={handleApprove}>
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />승인
        </Button>
        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={loading} onClick={handleDeny}>
          <XCircle className="w-3.5 h-3.5 mr-1" />거절
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4 mr-2" />사용자 추가
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setLoginIdVerified(false); setError('') } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>사용자 추가</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>이름 *</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>역할 *</Label>
                <Select value={form.role} onValueChange={(v) => set('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">관리자</SelectItem>
                    <SelectItem value="DISTRIBUTOR_1">1차 배분자</SelectItem>
                    <SelectItem value="DISTRIBUTOR_2">2차 담당자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <LoginIdAvailabilityField
              id="admin-create-loginid"
              value={form.loginId}
              onChange={(v) => setForm((p) => ({ ...p, loginId: v }))}
              required
              onVerifiedChange={setLoginIdVerified}
            />
            <div className="space-y-1.5">
              <Label>이메일 *</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>초기 비밀번호 *</Label>
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} placeholder="8자 이상" />
            </div>
            <OrgSearchCombobox
              label="기관"
              valueId={form.organizationId}
              valueName={form.organizationName}
              onChange={(id, name) => setForm((p) => ({ ...p, organizationId: id, organizationName: name }))}
              hint="선택 사항입니다."
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>부서</Label>
                <Input value={form.department} onChange={(e) => set('department', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>팀</Label>
                <Input value={form.team} onChange={(e) => set('team', e.target.value)} />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}생성
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
