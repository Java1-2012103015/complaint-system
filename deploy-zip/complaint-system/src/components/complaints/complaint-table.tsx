'use client'

import { formatDate, formatDateTime } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { ClickableTableRow } from '@/components/complaints/clickable-table-row'
import { Paperclip, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { ComplaintListItem } from '@/types'
import { STATUS_LABELS } from '@/types'
import type { ComplaintStatus } from '@prisma/client'

const STATUS_FILTER_ALL = '__all__'

interface ComplaintTableProps {
  items: ComplaintListItem[]
  total: number
  page: number
  limit: number
  basePath: string // /admin/complaints or /distributor1 etc.
}

export function ComplaintTable({ items, total, page, limit, basePath }: ComplaintTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const totalPages = Math.ceil(total / limit)

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  return (
    <div className="space-y-4">
      {/* 검색 / 필터 */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="접수번호, 제목, 주소 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && updateParams({ search, page: '1' })}
          className="max-w-xs"
        />
        <Select
          value={searchParams.get('status') || STATUS_FILTER_ALL}
          onValueChange={(v) =>
            updateParams({ status: v === STATUS_FILTER_ALL ? '' : v, page: '1' })
          }
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
        <Button variant="secondary" onClick={() => { setSearch(''); updateParams({ search: '', status: '', page: '1' }) }}>
          초기화
        </Button>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">접수번호</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">유형</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">1차 담당</th>
                <th className="px-4 py-3">2차 담당</th>
                <th className="px-4 py-3">발생일자</th>
                <th className="px-4 py-3">접수일</th>
                <th className="px-4 py-3 text-center">파일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <ClickableTableRow key={item.id} href={`${basePath}/${item.id}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {item.receiptNumber}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="font-medium text-gray-900 line-clamp-1 block">
                        {item.title}
                      </span>
                      {item.address && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.address}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.category || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.d1 ? (
                        <span className="text-xs">
                          <span className="font-medium">{item.d1.name}</span>
                          {item.d1.department && <span className="text-gray-400 ml-1">({item.d1.department})</span>}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.d2 ? (
                        <span className="text-xs">
                          <span className="font-medium">{item.d2.name}</span>
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(item.scheduledDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item._count.files > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Paperclip className="w-3 h-3" />
                          {item._count.files}
                        </span>
                      )}
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>총 {total.toLocaleString()}건</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) })}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-2">{page} / {Math.max(1, totalPages)}</span>
          <Button
            variant="outline" size="sm"
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
