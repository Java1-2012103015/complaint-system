import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

// POST /api/complaints/[id]/reject
// body: { comment: string }
// D1 → ADMIN 반려 or D2 → D1 반려
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { comment } = await req.json()
  if (!comment?.trim()) {
    return NextResponse.json({ error: '반려 의견은 필수입니다.' }, { status: 400 })
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: { d1: true },
  })
  if (!complaint) return NextResponse.json({ error: '자율보고를 찾을 수 없습니다.' }, { status: 404 })

  const role = session.user.role
  const userId = session.user.id

  let toStatus: 'PENDING' | 'AGENCY_ASSIGNED'
  let actionType: string
  let event: 'REJECTED_TO_ADMIN' | 'REJECTED_TO_D1'
  let notifyUserId: string | undefined
  let notifyPhone: string | undefined
  let notifyEmail: string | undefined

  if (role === 'DISTRIBUTOR_1') {
    // 1차 → 관리자 반려
    if (complaint.d1Id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    toStatus = 'PENDING'
    actionType = 'REJECT_TO_ADMIN'
    event = 'REJECTED_TO_ADMIN'
    // 관리자들에게 알림 (첫 번째 관리자)
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } })
    notifyPhone = admin?.phone ?? undefined
    notifyEmail = admin?.email ?? undefined
    notifyUserId = admin?.id
  } else if (role === 'DISTRIBUTOR_2') {
    // 2차 → 1차 반려
    if (complaint.d2Id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!complaint.d1) return NextResponse.json({ error: '1차 배분자가 없습니다.' }, { status: 400 })
    toStatus = 'AGENCY_ASSIGNED'
    actionType = 'REJECT_TO_D1'
    event = 'REJECTED_TO_D1'
    notifyPhone = complaint.d1.phone ?? undefined
    notifyEmail = complaint.d1.email
    notifyUserId = complaint.d1.id
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.$transaction([
    prisma.complaint.update({
      where: { id: params.id },
      data: {
        status: toStatus,
        d2Id: role === 'DISTRIBUTOR_1' ? null : undefined,
        ...(role === 'DISTRIBUTOR_1'
          ? { d2InviteEmail: null, d1InviteEmail: null, d1InviteOrganizationId: null }
          : {}),
      },
    }),
    prisma.complaintHistory.create({
      data: {
        complaintId: params.id,
        actorId: userId,
        fromStatus: complaint.status,
        toStatus,
        comment,
        actionType,
      },
    }),
  ])

  sendNotification({
    event,
    complaintId: params.id,
    userId: notifyUserId,
    recipientPhone: notifyPhone,
    recipientEmail: notifyEmail,
    data: { receiptNumber: complaint.receiptNumber, title: complaint.title },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
