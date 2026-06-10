import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildNotificationMessage } from '@/lib/notifications'
import { generateTempPassword, hashPassword, isValidInviteEmail, normalizeInviteEmail } from '@/lib/utils'
import { allocateUniqueLoginIdFromEmail } from '@/lib/login-id'
import type { Role } from '@prisma/client'

async function buildComplainantNotifyMeta(
  complaint: { receiptNumber: string; complainantPhone: string | null },
  organizationName: string,
) {
  const data = {
    receiptNumber: complaint.receiptNumber,
    organizationName,
  }
  const messagePreview = await buildNotificationMessage('ASSIGNED_D1_COMPLAINANT', data)
  return {
    event: 'ASSIGNED_D1_COMPLAINANT' as const,
    messagePreview,
    complainantPhone: complaint.complainantPhone,
  }
}

// POST /api/complaints/[id]/assign
// body: { level, userId?, organizationId?, newUser?, inviteEmail? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const level = Number(body.level) as 1 | 2
  if (level !== 1 && level !== 2) {
    return NextResponse.json({ error: 'level은 1 또는 2여야 합니다.' }, { status: 400 })
  }

  const inviteRaw = body.inviteEmail
  const inviteEmailNorm =
    typeof inviteRaw === 'string' && inviteRaw.trim() !== '' ? normalizeInviteEmail(inviteRaw) : ''

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: {
      d1: { select: { organizationId: true } },
      d1InviteOrganization: { select: { id: true, name: true, isActive: true } },
    },
  })
  if (!complaint) return NextResponse.json({ error: '자율보고를 찾을 수 없습니다.' }, { status: 404 })

  if (level === 1 && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (level === 2) {
    const isAdmin = session.user.role === 'ADMIN'
    const isD1Owner = session.user.role === 'DISTRIBUTOR_1' && complaint.d1Id === session.user.id
    if (!isAdmin && !isD1Owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })
  const assignerEmail = actor?.email ?? ''

  // ── 가입 대기 이메일만 배정 (계정 없음) ─────────────────────────
  if (inviteEmailNorm) {
    if (!isValidInviteEmail(inviteRaw as string)) {
      return NextResponse.json({ error: '유효한 이메일 주소를 입력해 주세요.' }, { status: 400 })
    }

    const dup = await prisma.user.findUnique({ where: { email: inviteEmailNorm } })
    if (dup) {
      return NextResponse.json(
        { error: '해당 이메일은 이미 등록된 사용자입니다. 기존 사용자 배정을 이용해 주세요.' },
        { status: 400 },
      )
    }

    const d1OrgIdForL2 = complaint.d1?.organizationId ?? complaint.d1InviteOrganizationId ?? null
    if (level === 2 && !d1OrgIdForL2) {
      return NextResponse.json(
        { error: '1차 기관 정보가 없어 2차 담당자를 배정할 수 없습니다. 먼저 1차 담당(또는 1차 초대)을 설정해 주세요.' },
        { status: 400 },
      )
    }

    const isCompleted = complaint.status === 'COMPLETED'
    let updateData: Record<string, unknown>
    let historyToStatus: typeof complaint.status
    let historyComment: string
    let inviteOrgName = ''

    if (level === 1) {
      const bodyOrg = typeof body.organizationId === 'string' ? body.organizationId.trim() : ''
      if (!bodyOrg) {
        return NextResponse.json({ error: '기관을 선택해 주세요.' }, { status: 400 })
      }
      const org = await prisma.organization.findFirst({ where: { id: bodyOrg, isActive: true } })
      if (!org) return NextResponse.json({ error: '유효한 기관을 선택하세요.' }, { status: 400 })
      inviteOrgName = org.name

      const hasD1Slot = !!(complaint.d1Id || complaint.d1InviteEmail)
      historyComment = `가입대기 1차배정(${org.name} · ${inviteEmailNorm})`
      if (isCompleted) {
        updateData = {
          d1Id: null,
          d1InviteEmail: inviteEmailNorm,
          d1InviteOrganizationId: bodyOrg,
        }
        historyToStatus = 'COMPLETED'
      } else if (hasD1Slot) {
        updateData = {
          d1Id: null,
          d1InviteEmail: inviteEmailNorm,
          d1InviteOrganizationId: bodyOrg,
        }
        historyToStatus = complaint.status
      } else {
        updateData = {
          d1Id: null,
          d1InviteEmail: inviteEmailNorm,
          d1InviteOrganizationId: bodyOrg,
          status: 'AGENCY_ASSIGNED',
        }
        historyToStatus = 'AGENCY_ASSIGNED'
      }
    } else {
      historyComment = `가입대기 2차배정(${inviteEmailNorm})`
      if (isCompleted) {
        updateData = { d2Id: null, d2InviteEmail: inviteEmailNorm }
        historyToStatus = 'COMPLETED'
      } else {
        updateData = { d2Id: null, d2InviteEmail: inviteEmailNorm, status: 'OFFICER_ASSIGNED' }
        historyToStatus = 'OFFICER_ASSIGNED'
      }
    }

    const [updated] = await prisma.$transaction([
      prisma.complaint.update({ where: { id: params.id }, data: updateData as any }),
      prisma.complaintHistory.create({
        data: {
          complaintId: params.id,
          actorId: session.user.id,
          fromStatus: complaint.status,
          toStatus: historyToStatus as any,
          actionType: level === 1 ? 'ASSIGN_D1' : 'ASSIGN_D2',
          comment: historyComment,
        },
      }),
    ])

    const event = level === 1 ? 'ASSIGNED_D1' : 'ASSIGNED_D2'
    const notifyData = {
      receiptNumber: complaint.receiptNumber,
      title: complaint.title,
      assignerEmail,
      assigneeEmail: inviteEmailNorm,
      signupEmail: inviteEmailNorm,
    }
    const messagePreview = await buildNotificationMessage(event, notifyData)

    const complainantNotifyMeta =
      level === 1 ? await buildComplainantNotifyMeta(complaint, inviteOrgName) : undefined

    return NextResponse.json({
      success: true,
      complaint: updated,
      notifyMeta: {
        level,
        event,
        messagePreview,
        assigneeEmail: inviteEmailNorm,
        assigneePhone: null,
        inviteOnly: true,
      },
      complainantNotifyMeta,
    })
  }

  // ── 기존 사용자 / 신규 계정 생성 배정 ────────────────────────────
  const { userId, newUser } = body

  let assigneeId: string
  let tempPassword: string | undefined

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, organizationId: true },
    })
    if (!user) return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })

    if (level === 2) {
      if (user.role !== 'DISTRIBUTOR_2') {
        return NextResponse.json({ error: '2차 담당자만 배정할 수 있습니다.' }, { status: 400 })
      }
      const d1OrgId = complaint.d1?.organizationId ?? complaint.d1InviteOrganizationId ?? null
      if (!d1OrgId) {
        return NextResponse.json(
          { error: '1차 담당자 소속 기관이 없어 2차 담당자를 배정할 수 없습니다.' },
          { status: 400 },
        )
      }
      if (user.organizationId !== d1OrgId) {
        return NextResponse.json(
          { error: '1차 담당자와 동일 소속(기관)의 2차 담당자만 배정할 수 있습니다.' },
          { status: 400 },
        )
      }
    }

    if (level === 1) {
      if (user.role !== 'DISTRIBUTOR_1') {
        return NextResponse.json({ error: '1차 담당자만 배정할 수 있습니다.' }, { status: 400 })
      }
      const bodyOrg = typeof body.organizationId === 'string' ? body.organizationId.trim() : ''
      if (!bodyOrg) {
        return NextResponse.json({ error: '기관을 선택해 주세요.' }, { status: 400 })
      }
      if (user.organizationId !== bodyOrg) {
        return NextResponse.json(
          { error: '선택한 기관 소속 담당자가 아닙니다.' },
          { status: 400 },
        )
      }
    }

    assigneeId = user.id
  } else if (newUser) {
    if (level !== 1) return NextResponse.json({ error: '2차 배분에서는 신규 생성 불가' }, { status: 400 })
    const orgId =
      typeof newUser.organizationId === 'string' && newUser.organizationId.trim() !== ''
        ? newUser.organizationId.trim()
        : null
    if (!orgId) {
      return NextResponse.json({ error: '신규 1차 담당자는 소속 기관을 선택해야 합니다.' }, { status: 400 })
    }
    const org = await prisma.organization.findFirst({ where: { id: orgId, isActive: true } })
    if (!org) return NextResponse.json({ error: '유효한 기관을 선택하세요.' }, { status: 400 })

    tempPassword = generateTempPassword()
    const hashed = await hashPassword(tempPassword)
    const emailTrim = String(newUser.email).trim()
    const existing = await prisma.user.findUnique({ where: { email: emailTrim } })
    const newLoginId = await allocateUniqueLoginIdFromEmail(emailTrim)
    const created = await prisma.user.upsert({
      where: { email: emailTrim },
      update: {
        name: newUser.name,
        department: newUser.department || null,
        organizationId: orgId,
        ...(!existing?.loginId ? { loginId: newLoginId } : {}),
      },
      create: {
        email: emailTrim,
        loginId: newLoginId,
        name: newUser.name,
        password: hashed,
        role: 'DISTRIBUTOR_1' as Role,
        department: newUser.department || null,
        organizationId: orgId,
        isTemporary: true,
      },
    })
    assigneeId = created.id
  } else {
    return NextResponse.json({ error: 'userId, newUser, inviteEmail 중 하나는 필수입니다.' }, { status: 400 })
  }

  const isCompleted = complaint.status === 'COMPLETED'

  const clearInvites =
    level === 1
      ? { d1InviteEmail: null, d1InviteOrganizationId: null }
      : { d2InviteEmail: null }

  let updateData: Record<string, unknown>
  let historyToStatus: typeof complaint.status

  const hasD1Slot = !!(complaint.d1Id || complaint.d1InviteEmail)

  if (level === 1) {
    if (isCompleted) {
      updateData = { d1Id: assigneeId, ...clearInvites }
      historyToStatus = 'COMPLETED'
    } else if (hasD1Slot) {
      updateData = { d1Id: assigneeId, ...clearInvites }
      historyToStatus = complaint.status
    } else {
      updateData = { d1Id: assigneeId, status: 'AGENCY_ASSIGNED', ...clearInvites }
      historyToStatus = 'AGENCY_ASSIGNED'
    }
  } else if (isCompleted) {
    updateData = { d2Id: assigneeId, ...clearInvites }
    historyToStatus = 'COMPLETED'
  } else {
    updateData = { d2Id: assigneeId, status: 'OFFICER_ASSIGNED', ...clearInvites }
    historyToStatus = 'OFFICER_ASSIGNED'
  }

  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: {
      email: true,
      loginId: true,
      phone: true,
      name: true,
      department: true,
      organization: { select: { name: true } },
    },
  })
  const orgName = assignee?.organization?.name ?? '소속기관 미등록'
  const assigneeName = assignee?.name ?? ''
  const dept = assignee?.department?.trim() ?? ''
  const historyComment =
    level === 1
      ? `기관배정(${orgName})`
      : `담당자배정(${[orgName, dept, assigneeName].filter(Boolean).join(' ')})`

  const [updated] = await prisma.$transaction([
    prisma.complaint.update({ where: { id: params.id }, data: updateData as any }),
    prisma.complaintHistory.create({
      data: {
        complaintId: params.id,
        actorId: session.user.id,
        fromStatus: complaint.status,
        toStatus: historyToStatus as any,
        actionType: level === 1 ? 'ASSIGN_D1' : 'ASSIGN_D2',
        comment: historyComment,
      },
    }),
  ])

  const event = level === 1 ? 'ASSIGNED_D1' : 'ASSIGNED_D2'
  const notifyData = {
    receiptNumber: complaint.receiptNumber,
    title: complaint.title,
    assignerEmail,
    assigneeEmail: assignee?.email ?? '',
    ...(tempPassword ? { tempPassword } : {}),
  }
  const messagePreview = await buildNotificationMessage(event, notifyData)

  const complainantNotifyMeta =
    level === 1 ? await buildComplainantNotifyMeta(complaint, orgName) : undefined

  return NextResponse.json({
    success: true,
    complaint: updated,
    tempPassword,
    loginId: assignee?.loginId ?? undefined,
    notifyMeta: {
      level,
      event,
      messagePreview,
      assigneeEmail: assignee?.email ?? null,
      assigneePhone: assignee?.phone ?? null,
      assigneeId,
    },
    complainantNotifyMeta,
  })
}
