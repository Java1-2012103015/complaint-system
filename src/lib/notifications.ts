import nodemailer from 'nodemailer'
import { prisma } from './prisma'
import type { NotificationEvent } from '@prisma/client'
import {
  DEFAULT_MESSAGE_TEMPLATES,
  defaultAssignerLabel,
  hydrateMessageTemplate,
  defaultPublicSiteUrl,
  type MessageTemplateData,
} from './message-template-defaults'
import { publicSiteTitleFromDb } from './public-site-title'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 25,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
  tls: { rejectUnauthorized: false },
})

/** DB 시스템 설정 또는 환경변수에서 알리고 발송 정보 (DB 우선) */
export async function getAligoSendConfig(): Promise<{ apiKey: string; userId: string; sender: string } | null> {
  const s = await prisma.systemSettings.findUnique({
    where: { id: 'singleton' },
    select: { aligoApiKey: true, aligoUserId: true, aligoSender: true },
  })
  if (s?.aligoApiKey && s.aligoUserId && s.aligoSender) {
    return {
      apiKey: s.aligoApiKey,
      userId: s.aligoUserId.trim(),
      sender: s.aligoSender.replace(/\D/g, ''),
    }
  }
  const apiKey = process.env.ALIGO_API_KEY
  const userId = process.env.ALIGO_USER_ID
  const sender = process.env.ALIGO_SENDER
  if (apiKey && userId && sender) {
    return { apiKey, userId: userId.trim(), sender: sender.replace(/\D/g, '') }
  }
  return null
}

async function sendAligo(phone: string, message: string): Promise<boolean> {
  const cfg = await getAligoSendConfig()
  if (!cfg) return false

  const params = new URLSearchParams({
    key: cfg.apiKey,
    user_id: cfg.userId,
    sender: cfg.sender,
    receiver: phone.replace(/-/g, ''),
    msg: message,
    msg_type: message.length > 90 ? 'LMS' : 'SMS',
  })

  try {
    const res = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const json = await res.json()
    return json.result_code === '1'
  } catch {
    return false
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.SMTP_HOST) return false
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@complaint.local',
      to, subject, html,
    })
    return true
  } catch {
    return false
  }
}

export interface NotificationData {
  receiptNumber?: string
  title?: string
  tempPassword?: string
  siteName?: string
  siteUrl?: string
  signupEmail?: string
  assignerEmail?: string
  assigneeEmail?: string
  assignerLabel?: string
  organizationName?: string
}

async function resolveNotificationBody(
  event: NotificationEvent,
  data: NotificationData,
): Promise<string> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'singleton' },
    select: { messageTemplates: true, siteName: true },
  })
  const siteTitle = publicSiteTitleFromDb(settings?.siteName)
  const merged: MessageTemplateData = {
    receiptNumber: data.receiptNumber,
    title: data.title,
    tempPassword: data.tempPassword,
    siteName: data.siteName ?? siteTitle,
    siteUrl: (data.siteUrl ?? defaultPublicSiteUrl()) || undefined,
    signupEmail: data.signupEmail,
    assignerEmail: data.assignerEmail,
    assigneeEmail: data.assigneeEmail,
    assignerLabel: data.assignerLabel ?? defaultAssignerLabel(event),
    organizationName: data.organizationName,
  }
  const raw = settings?.messageTemplates as Record<string, string> | null | undefined
  const map = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const custom = typeof map[event] === 'string' ? map[event].trim() : ''
  const template =
    custom || DEFAULT_MESSAGE_TEMPLATES[event] || '[{{siteName}}] 알림이 도착했습니다.'
  return hydrateMessageTemplate(template, merged, event)
}

/** 배정 알림 미리보기·발송 문구 생성 (DB 커스텀 문구 반영) */
export async function buildNotificationMessage(
  event: NotificationEvent,
  data: NotificationData,
): Promise<string> {
  return resolveNotificationBody(event, data)
}

type AssignNotifyEvent = 'ASSIGNED_D1' | 'ASSIGNED_D2' | 'ASSIGNED_D1_COMPLAINANT'

/** 배정 직후 관리자가 명시적으로 보내는 메일 1통 */
export async function sendAssignmentEmailOnly(params: {
  complaintId: string
  userId?: string | null
  event: AssignNotifyEvent
  data: NotificationData
  to: string
  /** 발송 직전 사용자가 수정한 최종 본문 */
  messageOverride?: string
}): Promise<{ success: boolean }> {
  const message =
    params.messageOverride?.trim() || (await resolveNotificationBody(params.event, params.data))
  const subject = `[자율보고 처리] ${params.data.receiptNumber ? `자율보고 알림 - ${params.data.receiptNumber}` : '계정 안내'}`
  const success = await sendEmail(
    params.to,
    subject,
    `<pre style="font-family:sans-serif;line-height:1.6">${message}</pre>`,
  )
  await prisma.notification.create({
    data: {
      complaintId: params.complaintId,
      userId: params.userId ?? null,
      type: 'EMAIL',
      event: params.event,
      recipient: params.to,
      message,
      success,
    },
  })
  return { success }
}

/** 배정 직후 관리자가 입력한 번호로 문자 1통 (알리고 연동) */
export async function sendAssignmentSmsOnly(params: {
  complaintId: string
  userId?: string | null
  event: AssignNotifyEvent
  data: NotificationData
  phone: string
  /** 발송 직전 사용자가 수정한 최종 본문 */
  messageOverride?: string
}): Promise<{ success: boolean }> {
  const message =
    params.messageOverride?.trim() || (await resolveNotificationBody(params.event, params.data))
  const normalized = params.phone.replace(/\D/g, '')
  const success = await sendAligo(normalized, message)
  await prisma.notification.create({
    data: {
      complaintId: params.complaintId,
      userId: params.userId ?? null,
      type: 'SMS',
      event: params.event,
      recipient: normalized,
      message,
      success,
    },
  })
  return { success }
}

export async function sendNotification(params: {
  event: NotificationEvent
  complaintId?: string
  userId?: string
  recipientPhone?: string
  recipientEmail?: string
  data: NotificationData
}) {
  const { event, complaintId, userId, recipientPhone, recipientEmail, data } = params
  const message = await resolveNotificationBody(event, data)

  const tasks: Array<Promise<void>> = []

  if (recipientPhone) {
    tasks.push(
      sendAligo(recipientPhone, message).then(async (success) => {
        await prisma.notification.create({
          data: { complaintId, userId, type: 'SMS', event, recipient: recipientPhone, message, success },
        })
      }).catch(() => {})
    )
  }

  if (recipientEmail) {
    const subject = `[자율보고 처리] ${data.receiptNumber ? `자율보고 알림 - ${data.receiptNumber}` : '계정 안내'}`
    tasks.push(
      sendEmail(recipientEmail, subject, `<pre style="font-family:sans-serif;line-height:1.6">${message}</pre>`)
        .then(async (success) => {
          await prisma.notification.create({
            data: { complaintId, userId, type: 'EMAIL', event, recipient: recipientEmail, message, success },
          })
        }).catch(() => {})
    )
  }

  await Promise.allSettled(tasks)
}
