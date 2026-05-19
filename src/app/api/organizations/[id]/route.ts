import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/organizations/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const data: { name?: string; isActive?: boolean } = {}
  if (typeof body.name === 'string') {
    const t = body.name.trim()
    if (!t) return NextResponse.json({ error: '기관명이 비어 있습니다.' }, { status: 400 })
    data.name = t
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 })
  }
  const org = await prisma.organization.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, isActive: true },
  })
  return NextResponse.json(org)
}
