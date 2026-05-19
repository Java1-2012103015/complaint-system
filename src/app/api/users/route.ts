import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/utils'
import { isValidLoginId } from '@/lib/login-id'
import type { Role } from '@prisma/client'

const userListSelect = {
  id: true,
  email: true,
  loginId: true,
  name: true,
  phone: true,
  role: true,
  department: true,
  team: true,
  isTemporary: true,
  createdAt: true,
  organization: { select: { id: true, name: true } },
  _count: { select: { d1Complaints: true, d2Complaints: true } },
} as const

// GET /api/users — 관리자: 전체 조회. 1차 담당자: 동일 소속 기관의 2차 담당자만(role=DISTRIBUTOR_2).
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = req.nextUrl.searchParams.get('role') as Role | null
  const organizationId = req.nextUrl.searchParams.get('organizationId')

  if (session.user.role === 'ADMIN') {
    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        isActive: true,
        ...(organizationId ? { organizationId } : {}),
      },
      select: userListSelect,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  }

  if (session.user.role === 'DISTRIBUTOR_1') {
    if (role !== 'DISTRIBUTOR_2') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    })
    const mine = me?.organizationId ?? null
    if (!mine) {
      return NextResponse.json([])
    }
    if (organizationId && organizationId !== mine) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const users = await prisma.user.findMany({
      where: {
        role: 'DISTRIBUTOR_2',
        organizationId: mine,
        isActive: true,
      },
      select: userListSelect,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST /api/users
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { email, name, loginId, role, department, team, organizationId, password } = body

  if (!email || !name || !role || !password || !loginId) {
    return NextResponse.json({ error: '이메일, 아이디, 이름, 역할, 비밀번호는 필수입니다.' }, { status: 400 })
  }
  if (!isValidLoginId(String(loginId))) {
    return NextResponse.json(
      { error: '아이디는 영문·숫자·밑줄(_)만 사용 가능하며 4~32자여야 합니다.' },
      { status: 400 }
    )
  }

  const lid = String(loginId).trim()
  if (organizationId) {
    const org = await prisma.organization.findFirst({
      where: { id: organizationId, isActive: true },
    })
    if (!org) return NextResponse.json({ error: '유효한 기관을 선택하세요.' }, { status: 400 })
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: String(email).trim() } })
  if (existingEmail) return NextResponse.json({ error: '이미 존재하는 이메일입니다.' }, { status: 409 })

  const existingLogin = await prisma.user.findUnique({ where: { loginId: lid } })
  if (existingLogin) return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 })

  const hashed = await hashPassword(password)
  const user = await prisma.user.create({
    data: {
      email: String(email).trim(),
      loginId: lid,
      name: String(name).trim(),
      role,
      department: department ? String(department).trim() : null,
      team: team ? String(team).trim() : null,
      organizationId: organizationId || null,
      password: hashed,
    },
    select: {
      id: true,
      email: true,
      loginId: true,
      name: true,
      role: true,
      department: true,
      team: true,
      organization: { select: { name: true } },
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
