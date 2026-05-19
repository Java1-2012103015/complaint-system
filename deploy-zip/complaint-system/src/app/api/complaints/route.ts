import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateReceiptNumber } from '@/lib/utils'
import type { ComplaintStatus } from '@prisma/client'

// GET /api/complaints - 자율보고 목록 조회
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(100, Number(searchParams.get('limit') || 20))
  const status = searchParams.get('status') as ComplaintStatus | null
  const search = searchParams.get('search') || ''

  const where: any = {}

  // 역할별 조회 범위 제한
  if (session.user.role === 'DISTRIBUTOR_1') {
    where.d1Id = session.user.id
  } else if (session.user.role === 'DISTRIBUTOR_2') {
    where.d2Id = session.user.id
  }

  if (status) where.status = status
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { receiptNumber: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        receiptNumber: true,
        title: true,
        category: true,
        address: true,
        status: true,
        scheduledDate: true,
        createdAt: true,
        updatedAt: true,
        d1: { select: { id: true, name: true, department: true, team: true, organization: { select: { name: true } } } },
        d2: { select: { id: true, name: true, department: true, team: true, organization: { select: { name: true } } } },
        _count: { select: { files: true } },
      },
    }),
    prisma.complaint.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}

// POST /api/complaints - 자율보고 단건 등록
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, content, category, address, scheduledDate,
          complainantName, complainantPhone, complainantEmail, complainantAddr } = body

  if (!title || !content) {
    return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 })
  }

  const complaint = await prisma.complaint.create({
    data: {
      receiptNumber: generateReceiptNumber(),
      title,
      content,
      category,
      address,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      complainantName,
      complainantPhone,
      complainantEmail,
      complainantAddr,
    },
  })

  return NextResponse.json(complaint, { status: 201 })
}
