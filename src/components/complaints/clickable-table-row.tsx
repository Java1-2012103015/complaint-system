'use client'

import { useRouter } from 'next/navigation'
import type { MouseEvent, ReactNode, TdHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function ClickableTableRow({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  const router = useRouter()
  return (
    <tr
      className={cn('cursor-pointer transition-colors hover:bg-gray-50', className)}
      onClick={() => router.push(href)}
    >
      {children}
    </tr>
  )
}

/** 행 클릭으로 상세 이동할 때, 이 셀 안의 클릭은 상세로 가지 않도록 막습니다. */
export function IsolateRowClick(props: TdHTMLAttributes<HTMLTableCellElement>) {
  const { className, onClick, children, ...rest } = props
  return (
    <td
      {...rest}
      className={className}
      onClick={(e: MouseEvent<HTMLTableCellElement>) => {
        e.stopPropagation()
        onClick?.(e)
      }}
    >
      {children}
    </td>
  )
}
