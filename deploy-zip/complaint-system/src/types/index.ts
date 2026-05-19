import type { Role, ComplaintStatus, NotificationType, NotificationEvent } from '@prisma/client'

export type { Role, ComplaintStatus, NotificationType, NotificationEvent }

export interface ComplaintListItem {
  id: string
  receiptNumber: string
  title: string
  category: string | null
  address: string | null
  status: ComplaintStatus
  scheduledDate: Date | null
  plannedEndDate: Date | null
  createdAt: Date
  updatedAt: Date
  d1: { id: string; name: string; department: string | null; team?: string | null; organization?: { name: string } | null } | null
  d2: { id: string; name: string; department: string | null; team?: string | null; organization?: { name: string } | null } | null
  _count: { files: number }
}

// 관리자용 (PII 포함)
export interface ComplaintListItemAdmin extends ComplaintListItem {
  complainantName: string | null
  complainantPhone: string | null
  complainantEmail: string | null
}

export interface UserSummary {
  id: string
  name: string
  email: string
  loginId?: string | null
  phone?: string | null
  department: string | null
  team?: string | null
  organization?: { name: string } | null
  role: Role
  isTemporary: boolean
}

export interface FileItem {
  id: string
  originalName: string
  url: string
  mimeType: string
  size: number
  uploadedAt: Date
}

export interface HistoryItem {
  id: string
  fromStatus: ComplaintStatus | null
  toStatus: ComplaintStatus
  comment: string | null
  actionType: string
  createdAt: Date
  actor: { id: string; name: string } | null
}

export interface ComplaintDetail {
  id: string
  receiptNumber: string
  title: string
  content: string
  category: string | null
  address: string | null
  scheduledDate: Date | null
  plannedStartDate: Date | null
  plannedEndDate: Date | null
  actionPlan: string | null
  resultSummary: string | null
  completedAt: Date | null
  status: ComplaintStatus
  createdAt: Date
  updatedAt: Date
  d1: UserSummary | null
  d2: UserSummary | null
  files: FileItem[]
  histories: HistoryItem[]
  // PII (관리자만)
  complainantName?: string | null
  complainantPhone?: string | null
  complainantEmail?: string | null
  complainantAddr?: string | null
}

export interface ParsedComplaint {
  receiptNumber: string
  title: string
  content: string
  category?: string
  address?: string
  complainantName?: string
  complainantPhone?: string
  scheduledDate?: string
  rawLine: string
}

export interface StatusStats {
  status: ComplaintStatus
  count: number
  label: string
  color: string
}

// ── 상수 ─────────────────────────────────────

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  PENDING: '접수대기',
  AGENCY_ASSIGNED: '기관배정',
  OFFICER_ASSIGNED: '담당자배정',
  IN_PROGRESS_PLAN: '처리중(계획수립중)',
  IN_PROGRESS_SCHED: '처리중(기간확정)',
  WAITING_APPROVAL: '승인대기',
  COMPLETED: '처리완료',
  REJECTED: '반려',
}

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  AGENCY_ASSIGNED: 'bg-blue-100 text-blue-700',
  OFFICER_ASSIGNED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS_PLAN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS_SCHED: 'bg-orange-100 text-orange-700',
  WAITING_APPROVAL: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

// 차트용 HEX 색상
export const STATUS_CHART_COLORS: Record<ComplaintStatus, string> = {
  PENDING: '#9ca3af',
  AGENCY_ASSIGNED: '#3b82f6',
  OFFICER_ASSIGNED: '#6366f1',
  IN_PROGRESS_PLAN: '#f59e0b',
  IN_PROGRESS_SCHED: '#f97316',
  WAITING_APPROVAL: '#a855f7',
  COMPLETED: '#22c55e',
  REJECTED: '#ef4444',
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: '관리자',
  DISTRIBUTOR_1: '1차 배분자',
  DISTRIBUTOR_2: '2차 배분자',
}
