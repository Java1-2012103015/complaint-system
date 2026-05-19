import bcrypt from 'bcryptjs'

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const INVITE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeInviteEmail(email: string): string {
  return String(email).trim().toLowerCase()
}

export function isValidInviteEmail(email: string): boolean {
  return INVITE_EMAIL_RE.test(normalizeInviteEmail(email))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

// 붙여넣기 텍스트 파싱 (탭/파이프/쉼표 구분자 자동 감지)
export function parsePastedText(raw: string): Array<Record<string, string>> {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = lines[0]
  const delimiter = header.includes('\t') ? '\t' : header.includes('|') ? '|' : ','
  const keys = header.split(delimiter).map((k) => k.trim())

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((v) => v.trim())
    return Object.fromEntries(keys.map((k, i) => [k, values[i] ?? '']))
  })
}

// 한국 전화번호 정규화
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return phone
}

// 접수번호 생성
export function generateReceiptNumber(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${datePart}-${random}`
}
