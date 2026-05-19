import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const COMMON_SELECT = {
  id: true,
  receiptNumber: true,
  title: true,
  content: true,
  category: true,
  address: true,
  scheduledDate: true,
  status: true,
  resultSummary: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  d1: {
    select: {
      id: true,
      name: true,
      email: true,
      loginId: true,
      phone: true,
      department: true,
      team: true,
      role: true,
      isTemporary: true,
      organization: { select: { name: true } },
    },
  },
  d2: {
    select: {
      id: true,
      name: true,
      email: true,
      loginId: true,
      phone: true,
      department: true,
      team: true,
      role: true,
      isTemporary: true,
      organization: { select: { name: true } },
    },
  },
  files: {
    select: { id: true, originalName: true, url: true, mimeType: true, size: true, uploadedAt: true },
  },
  histories: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true, fromStatus: true, toStatus: true, comment: true, actionType: true, createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  },
}

// GET /api/complaints/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    select: {
      ...COMMON_SELECT,
      // 개인정보는 선택적으로 포함
      complainantName: true,
      complainantPhone: true,
      complainantEmail: true,
      complainantAddr: true,
    },
  })

  if (!complaint) return NextResponse.json({ error: '자율보고를 찾을 수 없습니다.' }, { status: 404 })

  // D1/D2는 본인 담당 자율보고만 조회 가능
  const { role, id: userId } = session.user
  if (role === 'DISTRIBUTOR_1' && complaint.d1?.id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (role === 'DISTRIBUTOR_2' && complaint.d2?.id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // D1/D2 에게는 개인정보 필드 제거
  if (role !== 'ADMIN') {
    const { complainantName, complainantPhone, complainantEmail, complainantAddr, ...safe } = complaint
    return NextResponse.json(safe)
  }

  return NextResponse.json(complaint)
}

// PATCH /api/complaints/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const allowed = ['title', 'content', 'category', 'address', 'scheduledDate',
                   'complainantName', 'complainantPhone', 'complainantEmail', 'complainantAddr']
  const data: Record<string, any> = {}
  for (const key of allowed) {
    if (!(key in body)) continue
    if (key === 'scheduledDate') {
      data[key] = body[key] ? new Date(String(body[key])) : null
      continue
    }
    data[key] = body[key]
  }

  const updated = await prisma.complaint.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/complaints/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.complaint.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
