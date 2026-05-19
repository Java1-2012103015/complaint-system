/** 공개 페이지 헤더 등 — DB에 예전 기본값이 남아 있어도 제품명은 자율보고로 통일 */
export const DEFAULT_PUBLIC_SITE_TITLE = '자율보고 처리 시스템'

export function publicSiteTitleFromDb(stored: string | null | undefined): string {
  const s = (stored ?? '').trim()
  if (!s) return DEFAULT_PUBLIC_SITE_TITLE
  if (s.includes('민원')) return DEFAULT_PUBLIC_SITE_TITLE
  return s
}
