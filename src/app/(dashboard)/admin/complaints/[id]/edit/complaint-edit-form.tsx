'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FilePreview } from '@/components/complaints/file-preview'
import { formatFileSize } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import { Loader2, AlertCircle, ArrowLeft, Paperclip, X } from 'lucide-react'
import type { FileItem } from '@/types'

export interface ComplaintEditFormInitial {
  id: string
  receiptNumber: string
  title: string
  content: string
  category: string | null
  address: string | null
  scheduledDate: string
  complainantName: string | null
  complainantPhone: string | null
  complainantEmail: string | null
  complainantAddr: string | null
  files: FileItem[]
}

interface ComplaintEditFormProps {
  complaint: ComplaintEditFormInitial
}

export function ComplaintEditForm({ complaint }: ComplaintEditFormProps) {
  const router = useRouter()
  const attachInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingFiles, setExistingFiles] = useState<FileItem[]>(complaint.files)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [form, setForm] = useState({
    title: complaint.title,
    content: complaint.content,
    category: complaint.category ?? '',
    address: complaint.address ?? '',
    scheduledDate: complaint.scheduledDate,
    complainantName: complaint.complainantName ?? '',
    complainantPhone: complaint.complainantPhone ?? '',
    complainantEmail: complaint.complainantEmail ?? '',
    complainantAddr: complaint.complainantAddr ?? '',
  })

  function setField(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  function addPendingFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setPendingFiles((p) => [...p, ...selected])
    e.target.value = ''
  }

  function removePendingFile(idx: number) {
    setPendingFiles((p) => p.filter((_, i) => i !== idx))
  }

  async function deleteExistingFile(file: FileItem) {
    if (!confirm(`「${file.originalName}」을(를) 삭제할까요?`)) return
    setDeletingFileId(file.id)
    try {
      const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '삭제 실패')
      setExistingFiles((prev) => prev.filter((f) => f.id !== file.id))
      toast({ title: '첨부 파일 삭제됨', description: file.originalName })
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: err instanceof Error ? err.message : '처리 실패',
      })
    } finally {
      setDeletingFileId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.content) {
      setError('제목과 내용은 필수입니다.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: form.category || null,
          address: form.address || null,
          scheduledDate: form.scheduledDate || null,
          complainantName: form.complainantName || null,
          complainantPhone: form.complainantPhone || null,
          complainantEmail: form.complainantEmail || null,
          complainantAddr: form.complainantAddr || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '저장 실패')

      if (pendingFiles.length > 0) {
        const fd = new FormData()
        pendingFiles.forEach((f) => fd.append('files', f))
        const up = await fetch(`/api/upload?complaintId=${complaint.id}`, { method: 'POST', body: fd })
        const upData = await up.json().catch(() => ({}))
        if (!up.ok) {
          throw new Error(upData.error || '첨부 파일 업로드에 실패했습니다.')
        }
        if (upData.errors?.length) {
          const msg = upData.errors
            .map((x: { name?: string; error?: string }) => `${x.name ?? ''}: ${x.error ?? ''}`)
            .join('; ')
          toast({
            variant: 'destructive',
            title: '일부 첨부 실패',
            description: msg || '파일 형식·용량을 확인해 주세요.',
          })
        }
        setPendingFiles([])
      }

      router.push(`/admin/complaints/${complaint.id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/complaints/${complaint.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        상세로
      </Link>

      <div>
        <p className="font-mono text-xs text-gray-400 mb-1">{complaint.receiptNumber}</p>
        <h1 className="text-xl font-bold text-gray-900">자율보고 수정</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>자율보고 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>제목 *</Label>
              <Input
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="자율보고 제목"
              />
            </div>
            <div className="space-y-1.5">
              <Label>내용 *</Label>
              <Textarea
                rows={5}
                value={form.content}
                onChange={(e) => setField('content', e.target.value)}
                placeholder="자율보고 내용"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>유형</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                  placeholder="예: 환경, 시설"
                />
              </div>
              <div className="space-y-1.5">
                <Label>발생일자</Label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setField('scheduledDate', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>현장 주소</Label>
              <Input value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </div>

            <div className="space-y-2 pt-1 border-t">
              <Label>첨부 파일</Label>
              <p className="text-xs text-gray-500">
                자율보고 접수 시 첨부하는 파일입니다. PDF, JPG, PNG, GIF, WebP
              </p>
              {existingFiles.length > 0 && (
                <div className="rounded-md border bg-gray-50/50 p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">기존 첨부 ({existingFiles.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {existingFiles.map((f) => (
                      <FilePreview
                        key={f.id}
                        file={f}
                        onDelete={() => void deleteExistingFile(f)}
                        deleting={deletingFileId === f.id}
                      />
                    ))}
                  </div>
                </div>
              )}
              <input
                ref={attachInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                onChange={addPendingFiles}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => attachInputRef.current?.click()}>
                <Paperclip className="w-4 h-4 mr-2" />
                파일 추가
              </Button>
              {pendingFiles.length > 0 && (
                <ul className="rounded-md border divide-y text-sm max-w-xl">
                  {pendingFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50/80">
                      <span className="truncate font-medium text-gray-800">{f.name}</span>
                      <span className="text-gray-500 shrink-0 text-xs">{formatFileSize(f.size)}</span>
                      <button
                        type="button"
                        className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                        onClick={() => removePendingFile(i)}
                        aria-label="첨부 제거"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {pendingFiles.length > 0 && (
                <p className="text-xs text-gray-500">저장 시 위 파일이 추가됩니다.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              접수자 개인정보
              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                관리자만 열람
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>성명</Label>
                <Input value={form.complainantName} onChange={(e) => setField('complainantName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>연락처</Label>
                <Input
                  value={form.complainantPhone}
                  onChange={(e) => setField('complainantPhone', e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>이메일</Label>
                <Input
                  type="email"
                  value={form.complainantEmail}
                  onChange={(e) => setField('complainantEmail', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>주소</Label>
              <Input value={form.complainantAddr} onChange={(e) => setField('complainantAddr', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            저장
          </Button>
        </div>
      </form>
    </div>
  )
}
