import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'
import type { ComplaintStatus } from '@prisma/client'

// D2가 전환 가능한 상태
const D2_ALLOWED: ComplaintStatus[] = [
  'IN_PROGRESS_PLAN',
  'IN_PROGRESS_SCHED',
  'WAITING_APPROVAL',
]

// PATCH /api/complaints/[id]/status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    status,
    resultSummary,
    scheduledDate,
    actionPlan,
    plannedStartDate,
    plannedEndDate,
  } = await req.json()

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: { d1: true },
  })
  if (!complaint) return NextResponse.json({ error: '자율보고를 찾을 수 없습니다.' }, { status: 404 })

  const role = session.user.role

  // 권한 검증
  if (role === 'DISTRIBUTOR_2') {
    if (!D2_ALLOWED.includes(status)) {
      return NextResponse.json({ error: '허용되지 않는 상태 전환입니다.' }, { status: 400 })
    }
    if (complaint.d2Id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (role === 'ADMIN') {
    // 관리자는 모든 상태 가능
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isApprovalRequest = status === 'WAITING_APPROVAL'
  const updateData: any = {
    status,
    ...(resultSummary !== undefined && { resultSummary }),
    ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
    ...(actionPlan !== undefined && { actionPlan }),
    ...(plannedStartDate !== undefined && { plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null }),
    ...(plannedEndDate !== undefined && { plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null }),
  }

  await prisma.$transaction([
    prisma.complaint.update({ where: { id: params.id }, data: updateData }),
    prisma.complaintHistory.create({
      data: {
        complaintId: params.id,
        actorId: session.user.id,
        fromStatus: complaint.status,
        toStatus: status,
        actionType: isApprovalRequest ? 'REQUEST_APPROVAL' : 'STATUS_UPDATE',
      },
    }),
  ])

  // 승인 요청 시 D1에게 알림
  if (isApprovalRequest && complaint.d1) {
    sendNotification({
      event: 'APPROVAL_REQUESTED',
      complaintId: params.id,
      userId: complaint.d1.id,
      recipientPhone: complaint.d1.phone ?? undefined,
      recipientEmail: complaint.d1.email,
      data: { receiptNumber: complaint.receiptNumber, title: complaint.title },
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
