import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, normalizeInviteEmail } from '@/lib/utils'
import { isValidLoginId } from '@/lib/login-id'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 })
  }

  const name = body.name
  const loginId = body.loginId
  const email = body.email
  const organizationId = body.organizationId
  const department = body.department
  const team = body.team
  const password = body.password
  const roleInput = body.role

  if (!name || !loginId || !email || !password || !organizationId || !roleInput) {
    return NextResponse.json(
      { error: '이름, 아이디, 이메일, 기관, 담당 구분, 비밀번호는 필수입니다.' },
      { status: 400 },
    )
  }
  if (roleInput !== 'DISTRIBUTOR_1' && roleInput !== 'DISTRIBUTOR_2') {
    return NextResponse.json(
      { error: '담당 구분은 1차 배분자 또는 2차 담당자만 선택할 수 있습니다.' },
      { status: 400 },
    )
  }
  if (!isValidLoginId(String(loginId))) {
    return NextResponse.json(
      { error: '아이디는 영문·숫자·밑줄(_)만 사용 가능하며 4~32자여야 합니다.' },
      { status: 400 },
    )
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }

  try {
    const org = await prisma.organization.findFirst({
      where: { id: String(organizationId), isActive: true },
    })
    if (!org) {
      return NextResponse.json({ error: '선택한 기관을 찾을 수 없거나 비활성화되었습니다.' }, { status: 400 })
    }

    const lid = String(loginId).trim()
    const emailNorm = normalizeInviteEmail(String(email))

    const [dupEmail, dupLogin] = await Promise.all([
      prisma.user.findUnique({
        where: { email: emailNorm },
        select: { id: true, isTemporary: true, loginId: true, role: true },
      }),
      prisma.user.findUnique({ where: { loginId: lid }, select: { id: true } }),
    ])

    // 아이디: 본인(임시계정 병합)이 아닌 다른 계정이 쓰는 경우만 거절
    if (dupLogin && (!dupEmail || dupLogin.id !== dupEmail.id)) {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 })
    }

    // 정식 가입이 끝난 계정(임시 아님)만 이메일 중복 차단
    if (dupEmail && !dupEmail.isTemporary) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 })
    }

    const role = roleInput as 'DISTRIBUTOR_1' | 'DISTRIBUTOR_2'
    const hashed = await hashPassword(password)

    await prisma.$transaction(async (tx) => {
      const user = dupEmail?.isTemporary
        ? await tx.user.update({
            where: { id: dupEmail.id },
            data: {
              loginId: lid,
              name: String(name).trim(),
              organizationId: org.id,
              department: department ? String(department).trim() : null,
              team: team ? String(team).trim() : null,
              password: hashed,
              role,
              isTemporary: false,
              isActive: false,
            },
          })
        : await tx.user.create({
            data: {
              email: emailNorm,
              loginId: lid,
              name: String(name).trim(),
              organizationId: org.id,
              department: department ? String(department).trim() : null,
              team: team ? String(team).trim() : null,
              password: hashed,
              role,
              isActive: false,
            },
          })

      if (role === 'DISTRIBUTOR_1') {
        await tx.complaint.updateMany({
          where: {
            d1InviteEmail: emailNorm,
            d1InviteOrganizationId: org.id,
            d1Id: null,
          },
          data: {
            d1Id: user.id,
            d1InviteEmail: null,
            d1InviteOrganizationId: null,
          },
        })
      } else {
        await tx.complaint.updateMany({
          where: {
            d2InviteEmail: emailNorm,
            d2Id: null,
            OR: [
              { d1Id: { not: null }, d1: { organizationId: org.id } },
              { d1Id: null, d1InviteOrganizationId: org.id },
            ],
          },
          data: { d2Id: user.id, d2InviteEmail: null },
        })
      }
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: unknown) {
    console.error('[api/auth/signup]', e)
    const message =
      e instanceof Error ? e.message : '가입 처리 중 서버 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
