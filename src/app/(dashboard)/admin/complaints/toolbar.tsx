'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PasteImportModal } from '@/components/complaints/paste-import-modal'
import { STATUS_LABELS } from '@/types'
import type { ComplaintStatus } from '@prisma/client'
import { Search, Plus, ClipboardPaste, Eye, EyeOff, X, Download, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

/** Radix Select는 value="" 를 허용하지 않음 — URL에서는 status 생략으로 "전체" 표현 */
const STATUS_FILTER_ALL = '__all__'

interface AdminComplaintsToolbarProps {
  total: number
  showPii: boolean
}

export function AdminComplaintsToolbar({ total, showPii }: AdminComplaintsToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pasteOpen, setPasteOpen] = useState(false)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [exporting, setExporting] = useState(false)
  const [, startTransition] = useTransition()

  function push(updates: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) p.set(k, v); else p.delete(k)
    }
    p.set('page', '1')
    startTransition(() => router.push(`${pathname}?${p.toString()}`))
  }

  async function downloadCsv() {
    setExporting(true)
    try {
      const q = new URLSearchParams(searchParams.toString())
      q.delete('page')
      const res = await fetch(`/api/admin/complaints/export?${q.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '다운로드 실패')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";]+)"?/)
      a.download = match?.[1] ?? 'complaints.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast({
        title: '다운로드 완료',
        description: `현재 필터 기준 ${total.toLocaleString()}건을 CSV로 받았습니다.`,
      })
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: '다운로드 실패',
        description: e instanceof Error ? e.message : '처리 실패',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 pr-8"
            placeholder="접수번호, 제목, 접수자, 연락처..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && push({ search })}
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => { setSearch(''); push({ search: '' }) }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 상태 필터 */}
        <Select
          value={searchParams.get('status') || STATUS_FILTER_ALL}
          onValueChange={(v) => push({ status: v === STATUS_FILTER_ALL ? '' : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_FILTER_ALL}>전체</SelectItem>
            {(Object.keys(STATUS_LABELS) as ComplaintStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* PII 토글 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => push({ showPii: showPii ? 'false' : 'true' })}
          className={showPii ? 'border-blue-300 text-blue-700 bg-blue-50' : ''}
        >
          {showPii ? <Eye className="w-4 h-4 mr-1.5" /> : <EyeOff className="w-4 h-4 mr-1.5" />}
          {showPii ? '개인정보 표시 중' : '개인정보 숨김'}
        </Button>

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            disabled={exporting || total === 0}
            onClick={() => void downloadCsv()}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            CSV 다운로드
          </Button>
          <Button variant="outline" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste className="w-4 h-4 mr-2" />
            붙여넣기 등록
          </Button>
          <Button asChild>
            <Link href="/admin/complaints/new">
              <Plus className="w-4 h-4 mr-2" />
              자율보고 등록
            </Link>
          </Button>
        </div>
      </div>

      <PasteImportModal open={pasteOpen} onClose={() => setPasteOpen(false)} />
    </div>
  )
}
