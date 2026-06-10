'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

interface User {
  id: string
  name: string
  email: string
  loginId: string | null
  phone: string | null
  department: string | null
  organization?: { id: string; name: string } | null
}

interface OrganizationOption {
  id: string
  name: string
  isActive: boolean
}

interface NotifyMeta {
  level: 1 | 2
  event: 'ASSIGNED_D1' | 'ASSIGNED_D2'
  messagePreview: string
  assigneeEmail: string | null
  assigneePhone: string | null
  assigneeId?: string
  inviteOnly?: boolean
}

interface ComplainantNotifyMeta {
  event: 'ASSIGNED_D1_COMPLAINANT'
  messagePreview: string
  complainantPhone: string | null
}

interface AssignModalProps {
  open: boolean
  onClose: () => void
  complaintId: string
  level: 1 | 2
  /** 2차 배정 시: 현재 1차 담당자와 동일 소속(기관)의 2차 담당자만 조회 */
  d2OrganizationId?: string | null
}

type FlowView =
  | 'form'
  | 'temp_password'
  | 'notify_email'
  | 'notify_sms'
  | 'notify_sms_preview'
  | 'notify_complainant_sms'
  | 'notify_complainant_sms_preview'

export function AssignModal({ open, onClose, complaintId, level, d2OrganizationId }: AssignModalProps) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newUser, setNewUser] = useState({ name: '', email: '', department: '' })
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [createdLoginId, setCreatedLoginId] = useState('')

  const [flowView, setFlowView] = useState<FlowView>('form')
  const [notifyMeta, setNotifyMeta] = useState<NotifyMeta | null>(null)
  const [complainantNotifyMeta, setComplainantNotifyMeta] = useState<ComplainantNotifyMeta | null>(null)
  const [pendingTempPassword, setPendingTempPassword] = useState('')
  const [smsPhone, setSmsPhone] = useState('')
  const [complainantSmsPhone, setComplainantSmsPhone] = useState('')
  const [notifyDraft, setNotifyDraft] = useState('')
  const [complainantNotifyDraft, setComplainantNotifyDraft] = useState('')
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const didAssignRef = useRef(false)

  useEffect(() => {
    if (open) didAssignRef.current = false
  }, [open])

  useEffect(() => {
    if (!open) return
    if (level === 2) {
      if (!d2OrganizationId) {
        setUsers([])
        return
      }
      const qs = new URLSearchParams({ role: 'DISTRIBUTOR_2', organizationId: d2OrganizationId })
      fetch(`/api/users?${qs}`)
        .then((r) => r.json())
        .then((d) => setUsers(Array.isArray(d) ? d : []))
        .catch(() => setUsers([]))
      return
    }
    fetch('/api/organizations')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : []
        setOrganizations(list.filter((o: OrganizationOption) => o.isActive))
      })
      .catch(() => setOrganizations([]))
  }, [open, level, d2OrganizationId])

  useEffect(() => {
    if (!open || level !== 1) return
    if (!selectedOrgId) {
      setUsers([])
      return
    }
    fetch(`/api/users?role=DISTRIBUTOR_1&organizationId=${encodeURIComponent(selectedOrgId)}`)
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
  }, [open, level, selectedOrgId])

  useEffect(() => {
    if (!selectedOrgId || organizations.length === 0) return
    if (!organizations.some((o) => o.id === selectedOrgId)) {
      setSelectedOrgId('')
      setSelectedUserId('')
    }
  }, [organizations, selectedOrgId])

  useEffect(() => {
    if (!selectedUserId || users.length === 0) return
    if (!users.some((u) => u.id === selectedUserId)) setSelectedUserId('')
  }, [users, selectedUserId])

  useEffect(() => {
    if (!open) {
      setFlowView('form')
      setNotifyMeta(null)
      setComplainantNotifyMeta(null)
      setPendingTempPassword('')
      setSmsPhone('')
      setComplainantSmsPhone('')
      setNotifyDraft('')
      setComplainantNotifyDraft('')
      setTempPassword('')
      setCreatedLoginId('')
      setError('')
      setSelectedUserId('')
      setSelectedOrgId('')
      setOrganizations([])
      setUsers([])
      setNewUser({ name: '', email: '', department: '' })
      setInviteEmail('')
    }
  }, [open])

  function resetAndClose() {
    if (didAssignRef.current) router.refresh()
    didAssignRef.current = false
    setFlowView('form')
    setNotifyMeta(null)
    setComplainantNotifyMeta(null)
    setPendingTempPassword('')
    setSmsPhone('')
    setComplainantSmsPhone('')
    setNotifyDraft('')
    setComplainantNotifyDraft('')
    setTempPassword('')
    setCreatedLoginId('')
    setSelectedUserId('')
    setSelectedOrgId('')
    setOrganizations([])
    setUsers([])
    setNewUser({ name: '', email: '', department: '' })
    setInviteEmail('')
    setError('')
    onClose()
  }

  function startNotifyFlow(meta: NotifyMeta, tempPwd: string, complainantMeta?: ComplainantNotifyMeta) {
    setNotifyMeta(meta)
    setComplainantNotifyMeta(complainantMeta ?? null)
    setPendingTempPassword(tempPwd)
    setNotifyDraft(meta.messagePreview)
    const raw = meta.assigneePhone?.replace(/\D/g, '') ?? ''
    setSmsPhone(raw)
    if (complainantMeta) {
      setComplainantNotifyDraft(complainantMeta.messagePreview)
      setComplainantSmsPhone(complainantMeta.complainantPhone?.replace(/\D/g, '') ?? '')
    }
    setFlowView('notify_email')
  }

  function goToComplainantOrClose() {
    if (level === 1 && complainantNotifyMeta) {
      setComplainantNotifyDraft(complainantNotifyMeta.messagePreview)
      setComplainantSmsPhone(complainantNotifyMeta.complainantPhone?.replace(/\D/g, '') ?? '')
      setFlowView('notify_complainant_sms')
      return
    }
    resetAndClose()
  }

  async function fetchNotifyPreview(kind: 'email' | 'sms') {
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/complaints/${complaintId}/assignment-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          level: notifyMeta?.level ?? level,
          previewOnly: true,
          ...(pendingTempPassword ? { tempPassword: pendingTempPassword } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '미리보기 실패')
      if (typeof data.messagePreview === 'string') {
        setNotifyDraft(data.messagePreview)
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '미리보기 실패',
        description: e instanceof Error ? e.message : '알 수 없는 오류',
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function fetchComplainantPreview() {
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/complaints/${complaintId}/assignment-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'sms',
          level: 1,
          recipient: 'complainant',
          previewOnly: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '미리보기 실패')
      if (typeof data.messagePreview === 'string') {
        setComplainantNotifyDraft(data.messagePreview)
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '미리보기 실패',
        description: e instanceof Error ? e.message : '알 수 없는 오류',
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function postComplainantNotify(phone?: string, message?: string) {
    const bodyMessage = (message ?? complainantNotifyDraft).trim()
    if (!bodyMessage) {
      toast({ variant: 'destructive', title: '발송 실패', description: '메시지 내용을 입력해 주세요.' })
      return false
    }
    setNotifyLoading(true)
    try {
      const res = await fetch(`/api/complaints/${complaintId}/assignment-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'sms',
          level: 1,
          recipient: 'complainant',
          phone,
          message: bodyMessage,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '발송 실패')
      if (data.success === false) {
        throw new Error(data.error || '발송 실패')
      }
      return true
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '문자 발송 실패',
        description: e instanceof Error ? e.message : '알 수 없는 오류',
      })
      return false
    } finally {
      setNotifyLoading(false)
    }
  }

  async function postNotify(kind: 'email' | 'sms', phone?: string, message?: string) {
    const bodyMessage = (message ?? notifyDraft).trim()
    if (!bodyMessage) {
      toast({ variant: 'destructive', title: '발송 실패', description: '메시지 내용을 입력해 주세요.' })
      return false
    }
    setNotifyLoading(true)
    try {
      const res = await fetch(`/api/complaints/${complaintId}/assignment-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          level: notifyMeta?.level ?? level,
          phone: kind === 'sms' ? phone : undefined,
          message: bodyMessage,
          ...(pendingTempPassword ? { tempPassword: pendingTempPassword } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '발송 실패')
      if (data.success === false) {
        throw new Error(data.error || '발송 실패')
      }
      return true
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: kind === 'email' ? '메일 발송 실패' : '문자 발송 실패',
        description: e instanceof Error ? e.message : '알 수 없는 오류',
      })
      return false
    } finally {
      setNotifyLoading(false)
    }
  }

  async function handleSubmit(tab: 'existing' | 'new') {
    setError('')
    setLoading(true)
    try {
      const body =
        tab === 'existing'
          ? level === 1
            ? { level, userId: selectedUserId, organizationId: selectedOrgId }
            : { level, userId: selectedUserId }
          : { level, newUser: { ...newUser, organizationId: selectedOrgId } }

      const res = await fetch(`/api/complaints/${complaintId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '배분 실패')

      const meta = data.notifyMeta as NotifyMeta | undefined
      const complainantMeta = data.complainantNotifyMeta as ComplainantNotifyMeta | undefined
      const tp = typeof data.tempPassword === 'string' ? data.tempPassword : ''

      if (data.tempPassword) {
        didAssignRef.current = true
        setTempPassword(data.tempPassword)
        setCreatedLoginId(data.loginId || '')
        if (meta) {
          setNotifyMeta(meta)
          setComplainantNotifyMeta(complainantMeta ?? null)
          setNotifyDraft(meta.messagePreview)
          setPendingTempPassword(tp)
          const raw = meta.assigneePhone?.replace(/\D/g, '') ?? ''
          setSmsPhone(raw)
          if (complainantMeta) {
            setComplainantNotifyDraft(complainantMeta.messagePreview)
            setComplainantSmsPhone(complainantMeta.complainantPhone?.replace(/\D/g, '') ?? '')
          }
        }
        setFlowView('temp_password')
      } else if (meta) {
        didAssignRef.current = true
        startNotifyFlow(meta, tp, complainantMeta)
      } else {
        didAssignRef.current = true
        resetAndClose()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '배분 실패')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitInvite() {
    setError('')
    setLoading(true)
    try {
      const body =
        level === 1
          ? { level, inviteEmail: inviteEmail.trim(), organizationId: selectedOrgId }
          : { level, inviteEmail: inviteEmail.trim() }

      const res = await fetch(`/api/complaints/${complaintId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '배분 실패')

      const meta = data.notifyMeta as NotifyMeta | undefined
      const complainantMeta = data.complainantNotifyMeta as ComplainantNotifyMeta | undefined
      if (meta) {
        didAssignRef.current = true
        startNotifyFlow(meta, '', complainantMeta)
      } else {
        didAssignRef.current = true
        resetAndClose()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '배분 실패')
    } finally {
      setLoading(false)
    }
  }

  function handleDialogOpenChange(next: boolean) {
    if (!next) resetAndClose()
  }

  if (flowView === 'temp_password') {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계정 생성 완료</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">임시 계정이 생성되었습니다. 아래 정보를 담당자에게 전달하세요.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
              {createdLoginId && <p>아이디: <strong>{createdLoginId}</strong></p>}
              <p>이메일: <strong>{newUser.email}</strong></p>
              <p>임시 비밀번호: <strong className="text-blue-600">{tempPassword}</strong></p>
            </div>
            <p className="text-xs text-gray-500">
              다음 단계에서 메일·문자(알림톡) 발송 여부를 선택할 수 있습니다.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (notifyMeta) {
                  setFlowView('notify_email')
                  setTempPassword('')
                } else {
                  resetAndClose()
                }
              }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (flowView === 'notify_email' && notifyMeta) {
    const hasEmail = !!notifyMeta.assigneeEmail
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>메일 발송</DialogTitle>
            <DialogDescription>내용을 확인·수정한 뒤 발송하세요.</DialogDescription>
          </DialogHeader>
          {hasEmail ? (
            <p className="text-sm text-gray-600">
              수신 이메일: <span className="font-medium text-gray-900">{notifyMeta.assigneeEmail}</span>
            </p>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              담당자 계정에 이메일이 없어 메일로 알림을 보낼 수 없습니다.
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="notify-email-draft">발송 내용</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={previewLoading || !hasEmail}
                onClick={() => void fetchNotifyPreview('email')}
              >
                {previewLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                템플릿 다시 불러오기
              </Button>
            </div>
            <Textarea
              id="notify-email-draft"
              rows={8}
              value={notifyDraft}
              onChange={(e) => setNotifyDraft(e.target.value)}
              disabled={!hasEmail}
              className="text-sm leading-relaxed font-mono"
              placeholder="발송할 메일 본문"
            />
            <p className="text-xs text-gray-500">「문자 내용·인자 설정」 메뉴에서 템플릿을 바꿀 수 있습니다.</p>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={notifyLoading}
              onClick={() => setFlowView('notify_sms')}
            >
              건너뛰기
            </Button>
            <Button
              type="button"
              disabled={!hasEmail || notifyLoading || !notifyDraft.trim()}
              onClick={async () => {
                const ok = await postNotify('email')
                if (ok) {
                  toast({ title: '메일 발송', description: '담당자 이메일로 알림을 보냈습니다.' })
                  setFlowView('notify_sms')
                }
              }}
            >
              {notifyLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              발송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (flowView === 'notify_sms' && notifyMeta) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>문자(알림톡) 발송</DialogTitle>
            <DialogDescription>알림톡(문자)도 송부하시겠습니까?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="assign-sms-phone">수신 휴대폰</Label>
            <Input
              id="assign-sms-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01012345678"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
            />
            <p className="text-xs text-gray-500 leading-relaxed">
              입력된 핸드폰 번호는 저장되지 않습니다.
            </p>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={notifyLoading} onClick={() => goToComplainantOrClose()}>
              건너뛰기
            </Button>
            <Button
              type="button"
              disabled={notifyLoading || previewLoading || smsPhone.replace(/\D/g, '').length < 10}
              onClick={async () => {
                const d = smsPhone.replace(/\D/g, '')
                if (d.length < 10) return
                await fetchNotifyPreview('sms')
                setFlowView('notify_sms_preview')
              }}
            >
              {previewLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              미리보기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (flowView === 'notify_sms_preview' && notifyMeta) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>문자 발송 미리보기</DialogTitle>
            <DialogDescription>
              수신: <span className="font-medium text-gray-900">{smsPhone}</span> — 내용을 수정한 뒤 발송하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="notify-sms-draft">발송 내용</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={previewLoading}
                onClick={() => void fetchNotifyPreview('sms')}
              >
                {previewLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                템플릿 다시 불러오기
              </Button>
            </div>
            <Textarea
              id="notify-sms-draft"
              rows={8}
              value={notifyDraft}
              onChange={(e) => setNotifyDraft(e.target.value)}
              className="text-sm leading-relaxed font-mono"
              placeholder="발송할 문자 내용"
            />
            <p className="text-xs text-gray-500">
              {notifyDraft.length}자 (90자 초과 시 LMS로 발송될 수 있습니다)
            </p>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={notifyLoading}
              onClick={() => setFlowView('notify_sms')}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={notifyLoading || !notifyDraft.trim()}
              onClick={async () => {
                const ok = await postNotify('sms', smsPhone)
                if (ok) {
                  toast({ title: '문자 발송', description: '입력하신 번호로 알림 문자를 보냈습니다.' })
                  goToComplainantOrClose()
                }
              }}
            >
              {notifyLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              발송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (flowView === 'notify_complainant_sms' && complainantNotifyMeta) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>보고자 문자(알림톡) 발송</DialogTitle>
            <DialogDescription>
              접수자(보고자)에게 배정 안내 문자를 보낼 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="assign-complainant-sms-phone">수신 휴대폰</Label>
            <Input
              id="assign-complainant-sms-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01012345678"
              value={complainantSmsPhone}
              onChange={(e) => setComplainantSmsPhone(e.target.value)}
            />
            <p className="text-xs text-gray-500 leading-relaxed">
              접수 시 등록된 연락처가 있으면 자동으로 채워집니다. 입력된 번호는 저장되지 않습니다.
            </p>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={notifyLoading} onClick={() => resetAndClose()}>
              건너뛰기
            </Button>
            <Button
              type="button"
              disabled={notifyLoading || previewLoading || complainantSmsPhone.replace(/\D/g, '').length < 10}
              onClick={async () => {
                const d = complainantSmsPhone.replace(/\D/g, '')
                if (d.length < 10) return
                await fetchComplainantPreview()
                setFlowView('notify_complainant_sms_preview')
              }}
            >
              {previewLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              미리보기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (flowView === 'notify_complainant_sms_preview' && complainantNotifyMeta) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>보고자 문자 발송 미리보기</DialogTitle>
            <DialogDescription>
              수신: <span className="font-medium text-gray-900">{complainantSmsPhone}</span> — 내용을 수정한 뒤 발송하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="notify-complainant-sms-draft">발송 내용</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={previewLoading}
                onClick={() => void fetchComplainantPreview()}
              >
                {previewLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                템플릿 다시 불러오기
              </Button>
            </div>
            <Textarea
              id="notify-complainant-sms-draft"
              rows={6}
              value={complainantNotifyDraft}
              onChange={(e) => setComplainantNotifyDraft(e.target.value)}
              className="text-sm leading-relaxed font-mono"
              placeholder="발송할 문자 내용"
            />
            <p className="text-xs text-gray-500">
              {complainantNotifyDraft.length}자 (90자 초과 시 LMS로 발송될 수 있습니다)
            </p>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={notifyLoading}
              onClick={() => setFlowView('notify_complainant_sms')}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={notifyLoading || !complainantNotifyDraft.trim()}
              onClick={async () => {
                const ok = await postComplainantNotify(complainantSmsPhone)
                if (ok) {
                  toast({ title: '문자 발송', description: '보고자에게 배정 안내 문자를 보냈습니다.' })
                  resetAndClose()
                }
              }}
            >
              {notifyLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              발송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{level}차 담당자 배정</DialogTitle>
        </DialogHeader>

        {level === 1 && (
          <div className="space-y-1.5">
            <Label>기관 *</Label>
            {organizations.length === 0 ? (
              <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                활성 상태인 기관이 없습니다. 기관 관리에서 기관을 등록하거나 비활성을 해제한 뒤 다시 시도해 주세요.
              </p>
            ) : (
              <Select
                value={selectedOrgId || undefined}
                onValueChange={(v) => {
                  setSelectedOrgId(v)
                  setSelectedUserId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="기관을 먼저 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {organizations.length > 0 && (
              <p className="text-xs text-gray-500">
                선택한 기관에 소속된 1차 담당자만 아래 목록에 표시됩니다.
              </p>
            )}
          </div>
        )}

        {level === 2 && (
          <p className="text-xs text-gray-500 -mt-1 mb-2">
            1차 담당자와 동일한 소속(기관)에 등록된 2차 담당자만 선택할 수 있습니다.
          </p>
        )}

        <Tabs defaultValue="existing">
          <TabsList className={`grid w-full ${level === 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="existing" className="text-xs sm:text-sm">기존 사용자</TabsTrigger>
            {level === 1 && (
              <TabsTrigger value="new" className="text-xs sm:text-sm">신규 계정</TabsTrigger>
            )}
            <TabsTrigger value="invite" className="text-xs sm:text-sm">가입 대기(이메일)</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{level === 1 ? '1차 담당자 *' : '담당자 선택'}</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={
                  (level === 1 && (!selectedOrgId || users.length === 0))
                  || (level === 2 && !d2OrganizationId)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      level === 1
                        ? !selectedOrgId
                          ? '먼저 기관을 선택하세요'
                          : users.length === 0
                            ? '해당 기관에 1차 담당자가 없습니다'
                            : '담당자를 선택하세요'
                        : !d2OrganizationId
                          ? '1차 담당 소속 기관 정보가 없습니다'
                          : users.length === 0
                            ? '동일 소속에 등록된 2차 담당자가 없습니다'
                            : '2차 담당자를 선택하세요'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.loginId ? `${u.loginId} · ` : ''}{u.name}
                      {u.department ? ` (${u.department})` : ''} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => resetAndClose()}>취소</Button>
              <Button
                disabled={
                  loading
                  || !selectedUserId
                  || (level === 1 && (!selectedOrgId || users.length === 0))
                  || (level === 2 && (!d2OrganizationId || users.length === 0))
                }
                onClick={() => handleSubmit('existing')}
              >
                {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                배정
              </Button>
            </DialogFooter>
          </TabsContent>

          {level === 1 && (
            <TabsContent value="new" className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>이름 *</Label>
                  <Input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>이메일 *</Label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>소속 부서 (표기)</Label>
                  <Input value={newUser.department} onChange={(e) => setNewUser((p) => ({ ...p, department: e.target.value }))} placeholder="선택 · 배정용 표기" />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => resetAndClose()}>취소</Button>
                <Button
                  disabled={
                    !newUser.name
                    || !newUser.email
                    || !selectedOrgId
                    || loading
                  }
                  onClick={() => handleSubmit('new')}
                >
                  {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                  계정 생성 후 배정
                </Button>
              </DialogFooter>
            </TabsContent>
          )}

          <TabsContent value="invite" className="space-y-3 pt-2">
            <p className="text-xs text-gray-500">
              아직 회원가입하지 않은 이메일로 배정합니다. 해당 이메일·기관으로 가입 승인되면 자동으로 이 건에 연결됩니다.
            </p>
            <div className="space-y-1.5">
              <Label>초대 이메일 *</Label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="담당자 이메일"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            {level === 1 && !selectedOrgId && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                상단에서 기관을 먼저 선택해 주세요.
              </p>
            )}
            {level === 2 && !d2OrganizationId && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                1차 담당(또는 1차 초대)의 소속 기관이 없으면 2차 이메일 배정을 할 수 없습니다.
              </p>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => resetAndClose()}>취소</Button>
              <Button
                disabled={
                  loading
                  || !inviteEmail.trim()
                  || (level === 1 && !selectedOrgId)
                  || (level === 2 && !d2OrganizationId)
                }
                onClick={() => handleSubmitInvite()}
              >
                {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                이메일로 배정
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
