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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import type { MessageTemplateVariable } from '@/lib/message-template-defaults'

interface MessageTemplateVariablesTableProps {
  variables: (MessageTemplateVariable & { isCustomized: boolean })[]
}

export function MessageTemplateVariablesTable({ variables }: MessageTemplateVariablesTableProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<MessageTemplateVariable | null>(null)
  const [isCustomized, setIsCustomized] = useState(false)
  const [form, setForm] = useState({ label: '', description: '', example: '' })
  const [saving, setSaving] = useState(false)

  function openEdit(v: MessageTemplateVariable & { isCustomized: boolean }) {
    setSelected(v)
    setIsCustomized(v.isCustomized)
    setForm({ label: v.label, description: v.description, example: v.example })
    setOpen(true)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/message-template-variables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: selected.key,
          label: form.label,
          description: form.description,
          example: form.example,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '저장 실패')
      toast({ title: '저장됨', description: `{{${selected.key}}} 인자 정보를 수정했습니다.` })
      setOpen(false)
      router.refresh()
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: e instanceof Error ? e.message : '저장 실패',
      })
    } finally {
      setSaving(false)
    }
  }

  async function resetToDefault() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/message-template-variables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: selected.key, reset: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '초기화 실패')
      toast({ title: '초기화됨', description: `{{${selected.key}}} 인자를 기본값으로 되돌렸습니다.` })
      setOpen(false)
      router.refresh()
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: e instanceof Error ? e.message : '초기화 실패',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">치환 인자 목록</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            템플릿 본문에 <code className="bg-gray-100 px-1 rounded">{'{{인자명}}'}</code> 형식으로 넣으면 발송 시 실제 값으로 바뀝니다.
            행을 클릭하면 표시명·설명·예시를 수정할 수 있습니다.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">인자</th>
                <th className="px-4 py-2 font-medium">설명</th>
                <th className="px-4 py-2 font-medium">예시</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {variables.map((v) => (
                <tr
                  key={v.key}
                  className="hover:bg-gray-50/80 cursor-pointer"
                  onClick={() => openEdit(v)}
                  title="클릭하여 수정"
                >
                  <td className="px-4 py-2.5 align-top whitespace-nowrap">
                    <code className="text-xs bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {v.label}
                      {v.isCustomized && (
                        <span className="ml-1 text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                          수정됨
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 align-top text-gray-600 text-xs leading-relaxed">{v.description}</td>
                  <td className="px-4 py-2.5 align-top text-gray-500 text-xs font-mono whitespace-pre-wrap">{v.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>치환 인자 수정</DialogTitle>
            {selected && (
              <DialogDescription>
                <code className="text-xs bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">{`{{${selected.key}}}`}</code>
                <span className="ml-2 text-gray-500">인자명은 변경할 수 없습니다.</span>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>표시명</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>예시</Label>
              <Textarea
                value={form.example}
                onChange={(e) => setForm((p) => ({ ...p, example: e.target.value }))}
                rows={2}
                className="text-sm font-mono"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isCustomized && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                disabled={saving}
                onClick={() => void resetToDefault()}
              >
                기본값으로
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
