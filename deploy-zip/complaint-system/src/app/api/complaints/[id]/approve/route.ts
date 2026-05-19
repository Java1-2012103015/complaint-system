import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

// POST /api/complaints/[id]/approve
// body: { action: 'approve' | 'reject', comment?: string }
// 1차 배분자(D1)가 D2의 처리 결과를 승인하거나 D2에게 반려
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'DISTRIBUTOR_1' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { action, comment } = await req.json()

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action은 approve 또는 reject 이어야 합니다.' }, { status: 400 })
  }
  if (action === 'reject' && !comment?.trim()) {
    return NextResponse.json({ error: '반려 의견은 필수입니다.' }, { status: 400 })
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: { d2: true },
  })

  if (!complaint) return NextResponse.json({ error: '자율보고를 찾을 수 없습니다.' }, { status: 404 })

  if (complaint.status !== 'WAITING_APPROVAL') {
    return NextResponse.json({ error: '승인 대기 상태가 아닙니다.' }, { status: 400 })
  }

  // D1은 본인 담당 자율보고만
  if (session.user.role === 'DISTRIBUTOR_1' && complaint.d1Id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action === 'approve') {
    // 최종 승인 → COMPLETED
    await prisma.$transaction([
      prisma.complaint.update({
        where: { id: params.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
      prisma.complaintHistory.create({
        data: {
          complaintId: params.id,
          actorId: session.user.id,
          fromStatus: 'WAITING_APPROVAL',
          toStatus: 'COMPLETED',
          actionType: 'APPROVE',
        },
      }),
    ])

    sendNotification({
      event: 'APPROVED',
      complaintId: params.id,
      userId: complaint.d2Id ?? undefined,
      recipientPhone: complaint.d2?.phone ?? undefined,
      recipientEmail: complaint.d2?.email ?? undefined,
      data: { receiptNumber: complaint.receiptNumber, title: complaint.title },
    }).catch(() => {})

  } else {
    // D2에게 반려 → OFFICER_ASSIGNED (재작업 요청)
    await prisma.$transaction([
      prisma.complaint.update({
        where: { id: params.id },
        data: { status: 'OFFICER_ASSIGNED' },
      }),
      prisma.complaintHistory.create({
        data: {
          complaintId: params.id,
          actorId: session.user.id,
          fromStatus: 'WAITING_APPROVAL',
          toStatus: 'OFFICER_ASSIGNED',
          comment,
          actionType: 'REJECT_TO_D2',
        },
      }),
    ])

    sendNotification({
      event: 'REJECTED_TO_D2',
      complaintId: params.id,
      userId: complaint.d2Id ?? undefined,
      recipientPhone: complaint.d2?.phone ?? undefined,
      recipientEmail: complaint.d2?.email ?? undefined,
      data: { receiptNumber: complaint.receiptNumber, title: complaint.title },
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
