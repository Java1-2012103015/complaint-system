import type { ComplaintStatus, Prisma } from '@prisma/client'

/** 관리자 자율보고 목록·CSV보내기 공통 필터 */
export function buildAdminComplaintWhere(params: {
  status?: ComplaintStatus
  search?: string
}): Prisma.ComplaintWhereInput {
  const where: Prisma.ComplaintWhereInput = {}
  if (params.status) where.status = params.status
  const search = params.search?.trim()
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { receiptNumber: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { complainantName: { contains: search, mode: 'insensitive' } },
      { complainantPhone: { contains: search, mode: 'insensitive' } },
    ]
  }
  return where
}
