import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/organizations — 관리자: 전체 목록
export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const orgs = await prisma.organization.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  })
  return NextResponse.json(orgs)
}

// POST /api/organizations — 관리자: 기관 등록
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { name } = await req.json()
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) {
    return NextResponse.json({ error: '기관명을 입력하세요.' }, { status: 400 })
  }
  const org = await prisma.organization.create({
    data: { name: trimmed },
    select: { id: true, name: true, isActive: true },
  })
  return NextResponse.json(org, { status: 201 })
}
