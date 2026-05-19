import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** 공개: 가입 화면 기관 검색 (활성 기관만) */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  const where = {
    isActive: true,
    ...(q.length > 0 ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
  }
  const orgs = await prisma.organization.findMany({
    where,
    take: 40,
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  return NextResponse.json(orgs)
}
