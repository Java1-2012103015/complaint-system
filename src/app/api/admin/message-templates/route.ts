import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { NotificationEvent } from '@prisma/client'
import { EDITABLE_NOTIFICATION_EVENTS } from '@/lib/message-template-defaults'

function parseTemplates(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  return out
}

// PATCH /api/admin/message-templates — body: { event: NotificationEvent, template: string } (빈 문자열이면 기본문구로 복귀)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const event = body.event as string
  const template = typeof body.template === 'string' ? body.template.trim() : ''

  if (!(EDITABLE_NOTIFICATION_EVENTS as readonly string[]).includes(event)) {
    return NextResponse.json({ error: '유효하지 않은 알림 유형입니다.' }, { status: 400 })
  }

  const row = await prisma.systemSettings.findUnique({
    where: { id: 'singleton' },
    select: { messageTemplates: true },
  })
  const prev = parseTemplates(row?.messageTemplates)
  const next: Record<string, string> = { ...prev }
  if (!template) {
    delete next[event]
  } else {
    next[event] = template
  }

  await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', messageTemplates: next },
    update: { messageTemplates: next },
  })

  return NextResponse.json({ success: true })
}
