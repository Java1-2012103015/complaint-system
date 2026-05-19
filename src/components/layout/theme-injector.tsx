import { prisma } from '@/lib/prisma'

function safeCssColor(value: string | undefined, fallback: string): string {
  const v = (value || '').trim()
  if (/^#[0-9A-Fa-f]{6}$/i.test(v)) return v
  return fallback
}

// 서버 컴포넌트: DB의 시스템 설정을 읽어 CSS 변수를 <style> 태그로 주입
export async function ThemeInjector() {
  const fallbackP = '#2563eb'
  const fallbackA = '#7c3aed'
  let primaryColor = fallbackP
  let accentColor = fallbackA

  try {
    const db = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } })
    if (db) {
      primaryColor = safeCssColor(db.primaryColor, fallbackP)
      accentColor = safeCssColor(db.accentColor, fallbackA)
    }
  } catch {
    // DB 미준비 시 기본값 사용
  }

  const css = `:root { --sys-primary: ${primaryColor}; --sys-accent: ${accentColor}; }`

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
