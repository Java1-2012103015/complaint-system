import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  MESSAGE_TEMPLATE_VARIABLES,
  parseMessageTemplateVariableMeta,
} from '@/lib/message-template-defaults'

const VALID_KEYS = new Set(MESSAGE_TEMPLATE_VARIABLES.map((v) => v.key))

// PATCH /api/admin/message-template-variables
// body: { key: string, label?: string, description?: string, example?: string, reset?: boolean }
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const key = typeof body.key === 'string' ? body.key.trim() : ''
  if (!VALID_KEYS.has(key)) {
    return NextResponse.json({ error: '유효하지 않은 치환 인자입니다.' }, { status: 400 })
  }

  const row = await prisma.systemSettings.findUnique({
    where: { id: 'singleton' },
    select: { messageTemplateVariableMeta: true },
  })
  const prev = parseMessageTemplateVariableMeta(row?.messageTemplateVariableMeta)
  const next = { ...prev }

  if (body.reset === true) {
    delete next[key]
  } else {
    const label = typeof body.label === 'string' ? body.label.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const example = typeof body.example === 'string' ? body.example.trim() : ''

    if (!label || !description || !example) {
      return NextResponse.json(
        { error: '표시명, 설명, 예시는 모두 입력해야 합니다.' },
        { status: 400 },
      )
    }

    next[key] = { label, description, example }
  }

  await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', messageTemplateVariableMeta: next },
    update: { messageTemplateVariableMeta: next },
  })

  return NextResponse.json({ success: true })
}
