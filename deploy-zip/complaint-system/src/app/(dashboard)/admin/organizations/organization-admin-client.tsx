'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Plus, AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface OrgRow {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  _count: { users: number }
}

export function OrganizationAdminClient({ initialOrgs }: { initialOrgs: OrgRow[] }) {
  const router = useRouter()
  const [orgs, setOrgs] = useState(initialOrgs)

  useEffect(() => {
    setOrgs(initialOrgs)
  }, [initialOrgs])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  async function refresh() {
    const res = await fetch('/api/organizations')
    if (res.ok) setOrgs(await res.json())
    router.refresh()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '등록 실패')
      setName('')
      setOpen(false)
      await refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setSavingId(id)
    try {
      await fetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      await refresh()
    } finally {
      setSavingId(null)
    }
  }

  async function rename(id: string, nextName: string) {
    const t = nextName.trim()
    if (!t) return
    setSavingId(id)
    try {
      await fetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: t }),
      })
      await refresh()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          기관 등록
        </Button>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-4 py-3 text-left">기관명</th>
              <th className="px-4 py-3 text-center">사용자 수</th>
              <th className="px-4 py-3 text-center">가입 검색</th>
              <th className="px-4 py-3 text-left">표시명 수정</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orgs.map((o) => (
              <OrgNameRow
                key={o.id}
                org={o}
                disabled={savingId === o.id}
                onToggle={() => toggleActive(o.id, o.isActive)}
                onRename={(n) => rename(o.id, n)}
              />
            ))}
          </tbody>
        </table>
        {orgs.length === 0 && (
          <p className="py-10 text-center text-gray-500 text-sm">등록된 기관이 없습니다. 기관을 먼저 등록해 주세요.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기관 등록</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>표준 기관명 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: ○○환경청" required />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OrgNameRow({
  org,
  disabled,
  onToggle,
  onRename,
}: {
  org: OrgRow
  disabled: boolean
  onToggle: () => void
  onRename: (name: string) => void
}) {
  const [edit, setEdit] = useState(org.name)

  useEffect(() => {
    setEdit(org.name)
  }, [org.name])

  return (
    <tr className={!org.isActive ? 'bg-gray-50 opacity-70' : ''}>
      <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
      <td className="px-4 py-3 text-center text-gray-600">{org._count.users}</td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Switch checked={org.isActive} onCheckedChange={onToggle} disabled={disabled} />
          <span className="text-xs text-gray-500">{org.isActive ? '노출' : '숨김'}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 max-w-xs">
          <Input
            className="h-8 text-xs"
            value={edit}
            onChange={(e) => setEdit(e.target.value)}
            disabled={disabled}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 shrink-0"
            disabled={disabled || edit.trim() === org.name}
            onClick={() => onRename(edit)}
          >
            적용
          </Button>
        </div>
      </td>
    </tr>
  )
}
