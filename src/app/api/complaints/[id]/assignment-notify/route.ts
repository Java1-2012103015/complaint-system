import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  buildNotificationMessage,
  sendAssignmentEmailOnly,
  sendAssignmentSmsOnly,
  getAligoSendConfig,
  type NotificationData,
} from '@/lib/notifications'
import type { NotificationEvent } from '@prisma/client'

type Kind = 'email' | 'sms'

async function buildAssignmentNotifyContext(
  params: { id: string },
  session: { user: { id: string; role: string } },
  level: 1 | 2,
  tempPassword?: string,
) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      receiptNumber: true,
      title: true,
      d1Id: true,
      d2Id: true,
      d1InviteEmail: true,
      d2InviteEmail: true,
    },
  })
  if (!complaint) return { error: '자율보고를 찾을 수 없습니다.', status: 404 as const }

  if (level === 1 && session.user.role !== 'ADMIN') {
    return { error: 'Forbidden', status: 403 as const }
  }
  if (level === 2) {
    const isAdmin = session.user.role === 'ADMIN'
    const isD1Owner = session.user.role === 'DISTRIBUTOR_1' && complaint.d1Id === session.user.id
    if (!isAdmin && !isD1Owner) return { error: 'Forbidden', status: 403 as const }
  }

  const assigneeId = level === 1 ? complaint.d1Id : complaint.d2Id
  const inviteEmail = level === 1 ? complaint.d1InviteEmail : complaint.d2InviteEmail

  let toEmail: string | null = null
  let notifyUserId: string | null = null

  if (assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, email: true },
    })
    if (!assignee) return { error: '담당자를 찾을 수 없습니다.', status: 404 as const }
    toEmail = assignee.email
    notifyUserId = assignee.id
  } else if (inviteEmail) {
    toEmail = inviteEmail
    notifyUserId = null
  } else {
    return { error: '해당 차수 담당자가 아직 배정되어 있지 않습니다.', status: 400 as const }
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })

  const event: NotificationEvent = level === 1 ? 'ASSIGNED_D1' : 'ASSIGNED_D2'
  const data: NotificationData = {
    receiptNumber: complaint.receiptNumber,
    title: complaint.title,
    assignerEmail: actor?.email ?? undefined,
    assigneeEmail: toEmail ?? undefined,
    ...(tempPassword ? { tempPassword } : {}),
    ...(!assigneeId && inviteEmail ? { signupEmail: inviteEmail } : {}),
  }

  return {
    complaint,
    toEmail,
    notifyUserId,
    event,
    data,
  }
}

// POST /api/complaints/[id]/assignment-notify
// body: { kind, level, phone?, tempPassword?, message?, previewOnly?: boolean }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const kind = body.kind as Kind
  const level = Number(body.level) as 1 | 2
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const tempPassword = typeof body.tempPassword === 'string' ? body.tempPassword : undefined
  const previewOnly = body.previewOnly === true
  const customMessage = typeof body.message === 'string' ? body.message.trim() : ''

  if (kind !== 'email' && kind !== 'sms') {
    return NextResponse.json({ error: 'kind은 email 또는 sms 여야 합니다.' }, { status: 400 })
  }
  if (level !== 1 && level !== 2) {
    return NextResponse.json({ error: 'level은 1 또는 2 여야 합니다.' }, { status: 400 })
  }

  const ctx = await buildAssignmentNotifyContext(params, session, level, tempPassword)
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { toEmail, notifyUserId, event, data } = ctx
  const messagePreview = await buildNotificationMessage(event, data)

  if (previewOnly) {
    return NextResponse.json({ success: true, messagePreview })
  }

  const finalMessage = customMessage || messagePreview
  if (!finalMessage.trim()) {
    return NextResponse.json({ error: '발송할 메시지 내용이 비어 있습니다.' }, { status: 400 })
  }

  if (kind === 'email') {
    if (!toEmail) {
      return NextResponse.json({ error: '담당자 계정에 이메일이 없습니다.' }, { status: 400 })
    }
    const { success } = await sendAssignmentEmailOnly({
      complaintId: params.id,
      userId: notifyUserId,
      event,
      data,
      to: toEmail,
      messageOverride: finalMessage,
    })
    if (!success && !process.env.SMTP_HOST) {
      return NextResponse.json({
        success: false,
        messagePreview,
        error: '메일 서버(SMTP)가 설정되어 있지 않습니다.',
      })
    }
    if (!success) {
      return NextResponse.json({ success: false, messagePreview, error: '메일 발송에 실패했습니다.' })
    }
    return NextResponse.json({ success: true, messagePreview: finalMessage })
  }

  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 12) {
    return NextResponse.json({ error: '유효한 휴대폰 번호를 입력해 주세요.' }, { status: 400 })
  }

  const { success } = await sendAssignmentSmsOnly({
    complaintId: params.id,
    userId: notifyUserId,
    event,
    data,
    phone: digits,
    messageOverride: finalMessage,
  })

  const aligoCfg = await getAligoSendConfig()
  if (!success && !aligoCfg) {
    return NextResponse.json({
      success: false,
      messagePreview,
      error: '문자(알리고) API가 설정되어 있지 않습니다. 시스템 설정 또는 환경변수를 확인하세요.',
    })
  }
  if (!success) {
    return NextResponse.json({ success: false, messagePreview, error: '문자 발송에 실패했습니다.' })
  }
  return NextResponse.json({ success: true, messagePreview: finalMessage })
}
