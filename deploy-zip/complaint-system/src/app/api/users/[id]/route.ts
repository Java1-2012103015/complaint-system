import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/utils'

// PATCH /api/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isSelf = session.user.id === params.id
  const isAdmin = session.user.role === 'ADMIN'

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, any> = {}

  if (isAdmin && body.loginId !== undefined) {
    const { isValidLoginId } = await import('@/lib/login-id')
    const lid = String(body.loginId || '').trim()
    if (!isValidLoginId(lid)) {
      return NextResponse.json(
        { error: '아이디는 영문·숫자·밑줄(_)만 사용 가능하며 4~32자여야 합니다.' },
        { status: 400 }
      )
    }
    const taken = await prisma.user.findFirst({
      where: { loginId: lid, NOT: { id: params.id } },
    })
    if (taken) return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 })
    body.loginId = lid
  }

  if (isAdmin && body.organizationId !== undefined && body.organizationId !== null && body.organizationId !== '') {
    const org = await prisma.organization.findFirst({
      where: { id: body.organizationId, isActive: true },
    })
    if (!org) return NextResponse.json({ error: '유효한 기관을 선택하세요.' }, { status: 400 })
  }

  if (isAdmin) {
    const adminFields = ['name', 'phone', 'role', 'department', 'team', 'isActive', 'organizationId', 'loginId']
    for (const f of adminFields) {
      if (f in body) data[f] = body[f]
    }
  }

  // 비밀번호 변경 (본인만)
  if (body.password && isSelf) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
    }
    data.password = await hashPassword(body.password)
    data.isTemporary = false
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, email: true, loginId: true, name: true, role: true, department: true, team: true, isTemporary: true, isActive: true },
  })

  return NextResponse.json(updated)
}

// DELETE /api/users/[id]
// - 기본: 비활성화 (isActive: false)
// - ?hard=1: 배정 해제 후 DB에서 영구 삭제 (관리자만)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (session.user.id === params.id) {
    return NextResponse.json({ error: '본인 계정은 비활성화·삭제할 수 없습니다.' }, { status: 400 })
  }

  const hard = req.nextUrl.searchParams.get('hard') === '1'

  if (!hard) {
    await prisma.user.update({ where: { id: params.id }, data: { isActive: false } })
    return NextResponse.json({ success: true, mode: 'soft' })
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  })
  if (!target) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (target.role === 'ADMIN') {
    const remainingActiveAdmins = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true, NOT: { id: params.id } },
    })
    if (remainingActiveAdmins < 1) {
      return NextResponse.json(
        { error: '활성 관리자가 최소 1명은 남아 있어야 합니다. 다른 관리자를 승인·생성한 뒤 삭제하세요.' },
        { status: 400 }
      )
    }
  }

  await prisma.$transaction([
    prisma.complaint.updateMany({ where: { d1Id: params.id }, data: { d1Id: null } }),
    prisma.complaint.updateMany({ where: { d2Id: params.id }, data: { d2Id: null } }),
    prisma.complaintHistory.updateMany({ where: { actorId: params.id }, data: { actorId: null } }),
    prisma.notification.updateMany({ where: { userId: params.id }, data: { userId: null } }),
    prisma.user.delete({ where: { id: params.id } }),
  ])

  return NextResponse.json({ success: true, mode: 'hard' })
}
