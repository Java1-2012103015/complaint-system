'use client'

import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/complaints/status-badge'
import type { ComplaintStatus } from '@prisma/client'

interface Props {
  id: string
  receiptNumber: string
  title: string
  category: string | null
  status: ComplaintStatus
  createdAtText: string
  /** 관리자가 접수대기 목록에서 행 클릭 시 1차 배정(접수) 화면으로 이동 */
  adminPendingReceive?: boolean
}

export function PublicAllComplaintRow({
  id,
  receiptNumber,
  title,
  category,
  status,
  createdAtText,
  adminPendingReceive,
}: Props) {
  const router = useRouter()
  const href = `/admin/complaints/${id}?assign=1`

  if (adminPendingReceive) {
    return (
      <tr
        className="hover:bg-blue-50/80 cursor-pointer transition-colors"
        role="button"
        tabIndex={0}
        title="클릭하여 접수(1차 담당 배정)"
        onClick={() => router.push(href)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            router.push(href)
          }
        }}
      >
        <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap align-top">{receiptNumber}</td>
        <td className="px-4 py-3 text-gray-900 font-medium align-top">{title}</td>
        <td className="px-4 py-3 text-gray-500 align-top whitespace-nowrap">{category || '—'}</td>
        <td className="px-4 py-3 align-top whitespace-nowrap">
          <StatusBadge status={status} />
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap align-top hidden sm:table-cell">
          {createdAtText}
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50/80">
      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap align-top">{receiptNumber}</td>
      <td className="px-4 py-3 text-gray-900 font-medium align-top">{title}</td>
      <td className="px-4 py-3 text-gray-500 align-top whitespace-nowrap">{category || '—'}</td>
      <td className="px-4 py-3 align-top whitespace-nowrap">
        <StatusBadge status={status} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap align-top hidden sm:table-cell">
        {createdAtText}
      </td>
    </tr>
  )
}
