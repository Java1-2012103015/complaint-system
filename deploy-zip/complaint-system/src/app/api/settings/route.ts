import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const PUBLIC_DEFAULTS = {
  siteName: '자율보고 처리 시스템',
  logoText: '자율보고 처리',
  primaryColor: '#2563eb',
  accentColor: '#7c3aed',
}

// GET /api/settings — 비관리자는 외관만, 관리자는 알리고 키 제외 전체
export async function GET() {
  const session = await getSession()
  const isAdmin = session?.user.role === 'ADMIN'

  const settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } })
  if (!settings) {
    if (isAdmin) {
      return NextResponse.json({
        ...PUBLIC_DEFAULTS,
        adminEmail: 'admin@example.com',
        smsEnabled: false,
        emailEnabled: false,
        aligoUserId: '',
        aligoSender: '',
        hasAligoApiKey: false,
      })
    }
    return NextResponse.json(PUBLIC_DEFAULTS)
  }

  const { updatedAt, aligoApiKey, ...rest } = settings

  if (!isAdmin) {
    return NextResponse.json({
      siteName: rest.siteName,
      logoText: rest.logoText,
      primaryColor: rest.primaryColor,
      accentColor: rest.accentColor,
    })
  }

  return NextResponse.json({
    ...rest,
    hasAligoApiKey: !!aligoApiKey,
  })
}

// PATCH /api/settings — 관리자 전용
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as Record<string, unknown>
  const allowed = [
    'siteName',
    'logoText',
    'primaryColor',
    'accentColor',
    'adminEmail',
    'smsEnabled',
    'emailEnabled',
    'aligoUserId',
    'aligoSender',
  ] as const
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const rawKey = body.aligoApiKey
  if (typeof rawKey === 'string' && rawKey.trim() !== '') {
    data.aligoApiKey = rawKey.trim()
  }

  const updated = await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...PUBLIC_DEFAULTS, ...data },
    update: data,
  })

  const { aligoApiKey, updatedAt, ...safe } = updated
  return NextResponse.json({
    ...safe,
    hasAligoApiKey: !!aligoApiKey,
  })
}
