import type { NotificationEvent } from '@prisma/client'

/** 배포 URL (문자·메일 본문). NEXT_PUBLIC_APP_URL 우선, 없으면 NEXTAUTH_URL */
export function defaultPublicSiteUrl(): string {
  const u = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').trim()
  return u.replace(/\/$/, '')
}

/** 알림 본문 치환용 (notifications.ts의 NotificationData와 호환) */
export interface MessageTemplateData {
  receiptNumber?: string
  title?: string
  tempPassword?: string
  siteName?: string
  /** 서비스 접속 주소(미입력 시 환경변수 기본값) */
  siteUrl?: string
  /** 가입 대기(이메일만 배정) 시 사용등록 안내에 넣을 이메일 */
  signupEmail?: string
  /** 배정 알림: 배정 실행자 이메일 */
  assignerEmail?: string
  /** 배정 알림: 수신 담당자 이메일 */
  assigneeEmail?: string
  /** 배정 알림: 배정 실행자 역할 표기 (예: 1차 배정자, 1차 담당자) */
  assignerLabel?: string
  /** 1차 배정 보고자 안내: 배정된 기관명 */
  organizationName?: string
}

export function defaultAssignerLabel(event: NotificationEvent): string {
  if (event === 'ASSIGNED_D1') return '1차 배정자'
  if (event === 'ASSIGNED_D2') return '1차 담당자'
  return ''
}

export type MessageTemplateVariable = {
  key: string
  label: string
  description: string
  example: string
}

export type MessageTemplateVariableMeta = Partial<
  Pick<MessageTemplateVariable, 'label' | 'description' | 'example'>
>

/** 문자·메일 템플릿에서 사용 가능한 치환 인자 (기본값) */
export const MESSAGE_TEMPLATE_VARIABLES: MessageTemplateVariable[] = [
  { key: 'siteName', label: '사이트명', description: '시스템 설정의 사이트명', example: '한국철도공사' },
  { key: 'siteUrl', label: '접속 주소', description: 'NEXT_PUBLIC_APP_URL 등 환경변수', example: 'https://example.go.kr' },
  { key: 'siteUrlConfirmPhrase', label: '확인 URL 문구', description: '주소가 있을 때만: " https://…에서 확인하세요."', example: ' https://example.go.kr에서 확인하세요.' },
  { key: 'siteUrlPhrase', label: 'URL 안내 문구', description: '주소가 있을 때만: " …에서 확인 가능합니다."', example: ' https://example.go.kr 에서 확인 가능합니다.' },
  { key: 'assignerLabel', label: '배정자 역할', description: '1차 배정자 / 1차 담당자 등', example: '1차 배정자' },
  { key: 'assignerEmail', label: '배정자 이메일', description: '배정을 실행한 계정 이메일', example: 'admin@naver.com' },
  { key: 'assigneeEmail', label: '수신자 이메일', description: '배정 받은 담당자 이메일', example: 'assignee@naver.com' },
  { key: 'signupEmail', label: '초대 이메일', description: '가입 대기 배정 시 초대 주소', example: 'invite@naver.com' },
  { key: 'inviteSignupLine', label: '가입 안내 문단', description: '미가입 배정 시에만 자동 삽입', example: '기존 사용자가 아닐 경우…' },
  { key: 'receiptNumber', label: '접수번호(일련번호)', description: '자율보고 접수번호', example: '2026-00001' },
  { key: 'organizationName', label: '배정 기관명', description: '1차 배정된 기관 이름', example: 'OO공사' },
  { key: 'receiptLine', label: '접수번호 줄', description: '접수번호가 있을 때 줄바꿈+번호', example: '\\n접수번호: 2026-00001' },
  { key: 'titleLine', label: '제목 줄', description: '자율보고 제목이 있을 때', example: '\\n제목: 예시' },
  { key: 'tempBlock', label: '임시 비밀번호', description: '신규 계정 생성 시에만', example: '\\n임시 비밀번호: …' },
]

const VARIABLE_KEYS = new Set(MESSAGE_TEMPLATE_VARIABLES.map((v) => v.key))

export function parseMessageTemplateVariableMeta(
  raw: unknown,
): Record<string, MessageTemplateVariableMeta> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, MessageTemplateVariableMeta> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!VARIABLE_KEYS.has(k)) continue
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue
    const o = v as Record<string, unknown>
    const entry: MessageTemplateVariableMeta = {}
    if (typeof o.label === 'string' && o.label.trim()) entry.label = o.label.trim()
    if (typeof o.description === 'string' && o.description.trim()) {
      entry.description = o.description.trim()
    }
    if (typeof o.example === 'string' && o.example.trim()) entry.example = o.example.trim()
    if (Object.keys(entry).length > 0) out[k] = entry
  }
  return out
}

export function resolveMessageTemplateVariables(
  meta?: Record<string, MessageTemplateVariableMeta> | null,
): MessageTemplateVariable[] {
  return MESSAGE_TEMPLATE_VARIABLES.map((def) => {
    const o = meta?.[def.key]
    return {
      key: def.key,
      label: o?.label || def.label,
      description: o?.description || def.description,
      example: o?.example || def.example,
    }
  })
}

export function isMessageTemplateVariableCustomized(
  key: string,
  meta: Record<string, MessageTemplateVariableMeta>,
): boolean {
  const def = MESSAGE_TEMPLATE_VARIABLES.find((v) => v.key === key)
  const o = meta[key]
  if (!def || !o) return false
  return (
    (o.label !== undefined && o.label !== def.label) ||
    (o.description !== undefined && o.description !== def.description) ||
    (o.example !== undefined && o.example !== def.example)
  )
}

/** DB·관리자 화면에서 사용하는 기본 문구 ({{siteName}}{{receiptLine}}{{titleLine}}{{tempBlock}}) */
export const DEFAULT_MESSAGE_TEMPLATES: Record<NotificationEvent, string> = {
  ASSIGNED_D1:
    '{{siteName}} {{assignerLabel}}({{assignerEmail}})가 귀하({{assigneeEmail}})에게 철도안전 자율보고를 배정했습니다.{{siteUrlConfirmPhrase}}{{inviteSignupLine}}{{receiptLine}}{{titleLine}}{{tempBlock}}',
  ASSIGNED_D1_COMPLAINANT:
    '귀하의 {{receiptNumber}} 자율보고가 {{organizationName}}에 배정되었습니다.',
  ASSIGNED_D2:
    '{{siteName}} {{assignerLabel}}({{assignerEmail}})가 귀하({{assigneeEmail}})에게 철도안전 자율보고를 배정했습니다.{{siteUrlConfirmPhrase}}{{inviteSignupLine}}{{receiptLine}}{{titleLine}}{{tempBlock}}',
  REJECTED_TO_ADMIN: '[{{siteName}}] 자율보고가 관리자에게 반려되었습니다.{{receiptLine}}{{titleLine}}',
  REJECTED_TO_D1: '[{{siteName}}] 자율보고가 기관 담당자에게 반려되었습니다.{{receiptLine}}{{titleLine}}',
  REJECTED_TO_D2: '[{{siteName}}] 처리 결과가 반려되었습니다. 재작업 후 다시 제출해 주세요.{{receiptLine}}{{titleLine}}',
  APPROVAL_REQUESTED: '[{{siteName}}] 처리 결과 승인 요청이 도착했습니다.{{receiptLine}}{{titleLine}}',
  APPROVED: '[{{siteName}}] 처리 결과가 최종 승인되었습니다.{{receiptLine}}{{titleLine}}',
  STATUS_CHANGED: '[{{siteName}}] 자율보고 상태가 변경되었습니다.{{receiptLine}}',
  ACCOUNT_CREATED: '[{{siteName}}] 계정이 생성되었습니다.{{tempBlock}}',
  COMPLETED: '[{{siteName}}] 자율보고가 처리 완료되었습니다.{{receiptLine}}{{titleLine}}',
}

export const MESSAGE_SCENARIO_LABELS: Record<NotificationEvent, string> = {
  ASSIGNED_D1: '담당자 배정 확인 문자(관리자→1차)',
  ASSIGNED_D1_COMPLAINANT: '배정 안내 문자(관리자→보고자)',
  ASSIGNED_D2: '담당자 배정 확인 문자(1차→2차)',
  REJECTED_TO_ADMIN: '반송 문자(1차→관리자)',
  REJECTED_TO_D1: '반송 문자(2차→1차)',
  REJECTED_TO_D2: '반려 문자(1차→2차)',
  APPROVAL_REQUESTED: '승인 요청 문자(2차→1차)',
  APPROVED: '처리 결과 최종 승인 알림',
  STATUS_CHANGED: '상태 변경 알림',
  ACCOUNT_CREATED: '계정 생성 안내 문자',
  COMPLETED: '처리 완료 알림',
}

export const EDITABLE_NOTIFICATION_EVENTS: NotificationEvent[] = [
  'ASSIGNED_D1',
  'ASSIGNED_D1_COMPLAINANT',
  'ASSIGNED_D2',
  'REJECTED_TO_ADMIN',
  'REJECTED_TO_D1',
  'REJECTED_TO_D2',
  'APPROVAL_REQUESTED',
  'APPROVED',
  'COMPLETED',
  'STATUS_CHANGED',
  'ACCOUNT_CREATED',
]

export function hydrateMessageTemplate(
  template: string,
  data: MessageTemplateData,
  event?: NotificationEvent,
): string {
  const siteName = (data.siteName ?? '자율보고 처리').trim()
  const siteUrl = (data.siteUrl ?? '').trim()
  const siteUrlPhrase = siteUrl ? ` ${siteUrl} 에서 확인 가능합니다.` : ''
  const siteUrlConfirmPhrase = siteUrl ? ` ${siteUrl}에서 확인하세요.` : ''
  const assignerEmail = (data.assignerEmail ?? '').trim()
  const assigneeEmail = (data.assigneeEmail ?? '').trim()
  const assignerLabel = (data.assignerLabel ?? (event ? defaultAssignerLabel(event) : '')).trim()
  const signup = (data.signupEmail ?? '').trim()
  const inviteSignupLine = signup
    ? `\n기존 사용자가 아닐 경우, 이메일로 사용등록 진행 후 자율보고 확인 가능합니다. ${signup}`
    : ''
  const receiptNumber = (data.receiptNumber ?? '').trim()
  const organizationName = (data.organizationName ?? '').trim()
  const receiptLine = receiptNumber ? `\n접수번호: ${receiptNumber}` : ''
  const titleLine = data.title ? `\n제목: ${data.title}` : ''
  const tempBlock = data.tempPassword
    ? `\n임시 비밀번호: ${data.tempPassword}\n로그인 후 변경해 주세요.`
    : ''
  return template
    .replace(/\{\{siteName\}\}/g, siteName)
    .replace(/\{\{siteUrl\}\}/g, siteUrl)
    .replace(/\{\{siteUrlPhrase\}\}/g, siteUrlPhrase)
    .replace(/\{\{siteUrlConfirmPhrase\}\}/g, siteUrlConfirmPhrase)
    .replace(/\{\{assignerEmail\}\}/g, assignerEmail)
    .replace(/\{\{assigneeEmail\}\}/g, assigneeEmail)
    .replace(/\{\{assignerLabel\}\}/g, assignerLabel)
    .replace(/\{\{signupEmail\}\}/g, signup)
    .replace(/\{\{inviteSignupLine\}\}/g, inviteSignupLine)
    .replace(/\{\{receiptNumber\}\}/g, receiptNumber)
    .replace(/\{\{organizationName\}\}/g, organizationName)
    .replace(/\{\{receiptLine\}\}/g, receiptLine)
    .replace(/\{\{titleLine\}\}/g, titleLine)
    .replace(/\{\{tempBlock\}\}/g, tempBlock)
}
