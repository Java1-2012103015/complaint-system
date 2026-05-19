import { cn } from '@/lib/cn'
import { STATUS_COLORS, STATUS_LABELS } from '@/types'
import type { ComplaintStatus } from '@prisma/client'

interface StatusBadgeProps {
  status: ComplaintStatus
  className?: string
}

/** 처리중 계열: 상단 완료·승인대기와 같이 색 구분, '처리중' / 단계명을 한 줄 두 뱃지로 표시 */
const IN_PROGRESS_PHASE: Partial<Record<ComplaintStatus, string>> = {
  IN_PROGRESS_PLAN: '계획수립중',
  IN_PROGRESS_SCHED: '기간확정',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const phase = IN_PROGRESS_PHASE[status]
  if (phase) {
    return (
      <span className={cn('inline-flex items-center gap-1 flex-nowrap', className)}>
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
            'bg-amber-100 text-amber-900 ring-1 ring-amber-300/60',
          )}
        >
          처리중
        </span>
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
            STATUS_COLORS[status],
          )}
        >
          {phase}
        </span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        STATUS_COLORS[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
