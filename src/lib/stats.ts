import { prisma } from './prisma'
import { STATUS_LABELS, STATUS_CHART_COLORS, type StatusStats } from '@/types'
import type { ComplaintStatus } from '@prisma/client'

export async function getStatusStats(where?: object): Promise<StatusStats[]> {
  const grouped = await prisma.complaint.groupBy({
    by: ['status'],
    _count: { status: true },
    where,
    orderBy: { status: 'asc' },
  })

  const statuses = Object.keys(STATUS_LABELS) as ComplaintStatus[]

  return statuses
    .map((s) => {
      const found = grouped.find((g) => g.status === s)
      return {
        status: s,
        count: found?._count.status ?? 0,
        label: STATUS_LABELS[s],
        color: STATUS_CHART_COLORS[s],
      }
    })
    .filter((s) => s.count > 0)
}
