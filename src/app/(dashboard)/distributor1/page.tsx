import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { ComplaintTable } from '@/components/complaints/complaint-table'
import type { ComplaintStatus } from '@prisma/client'

interface PageProps {
  searchParams: { page?: string; status?: string; search?: string }
}

export default async function Distributor1Page({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== 'DISTRIBUTOR_1') redirect('/login')

  const page = Math.max(1, Number(searchParams.page || 1))
  const limit = 20
  const status = searchParams.status as ComplaintStatus | undefined
  const search = searchParams.search || ''

  const where: any = { d1Id: session.user.id }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { receiptNumber: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, receiptNumber: true, title: true, category: true,
        address: true, status: true, scheduledDate: true, createdAt: true, updatedAt: true,
        d1: { select: { id: true, name: true, department: true } },
        d2: { select: { id: true, name: true, department: true } },
        _count: { select: { files: true } },
      },
    }),
    prisma.complaint.count({ where }),
  ])

  return (
    <>
      <Header title="내 담당 자율보고" />
      <main className="flex-1 p-6">
        <ComplaintTable
          items={items as any}
          total={total}
          page={page}
          limit={limit}
          basePath="/distributor1/complaints"
        />
      </main>
    </>
  )
}
