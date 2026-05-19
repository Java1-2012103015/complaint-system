import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidLoginId } from '@/lib/login-id'

/** 가입 전 아이디 사용 가능 여부 (공개) */
export async function GET(req: NextRequest) {
  const loginId = (req.nextUrl.searchParams.get('loginId') || '').trim()
  if (!loginId) {
    return NextResponse.json({ valid: false, available: false, message: '아이디를 입력하세요.' }, { status: 400 })
  }
  if (!isValidLoginId(loginId)) {
    return NextResponse.json({
      valid: false,
      available: false,
      message: '영문·숫자·밑줄(_)만 4~32자로 입력하세요.',
    })
  }

  const existing = await prisma.user.findUnique({
    where: { loginId: loginId },
    select: { id: true },
  })

  const exclude = (req.nextUrl.searchParams.get('excludeUserId') || '').trim()
  if (existing && exclude && existing.id === exclude) {
    return NextResponse.json({
      valid: true,
      available: true,
      message: '현재 사용 중인 아이디입니다.',
    })
  }

  if (existing) {
    return NextResponse.json({
      valid: true,
      available: false,
      message: '이미 사용 중인 아이디입니다.',
    })
  }

  return NextResponse.json({
    valid: true,
    available: true,
    message: '사용 가능한 아이디입니다.',
  })
}
