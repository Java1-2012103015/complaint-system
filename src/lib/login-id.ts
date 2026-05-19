import { prisma } from './prisma'

const LOGIN_ID_RE = /^[a-zA-Z0-9_]{4,32}$/

export function isValidLoginId(loginId: string): boolean {
  return LOGIN_ID_RE.test(loginId.trim())
}

/** 신규 배정 등 이메일로부터 사용 가능한 loginId 생성 */
export async function allocateUniqueLoginIdFromEmail(email: string): Promise<string> {
  const local = email.split('@')[0] ?? 'user'
  let base = local.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'user'
  if (base.length < 4) base = `${base}____`.slice(0, 4)
  base = base.slice(0, 24)
  for (let i = 0; i < 2000; i++) {
    const candidate = (i === 0 ? base : `${base}_${i}`).slice(0, 32)
    const taken = await prisma.user.findUnique({ where: { loginId: candidate } })
    if (!taken) return candidate
  }
  return `u_${Date.now()}`.slice(0, 32)
}
