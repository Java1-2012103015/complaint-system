import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import {
  EDITABLE_NOTIFICATION_EVENTS,
  MESSAGE_SCENARIO_LABELS,
  DEFAULT_MESSAGE_TEMPLATES,
} from '@/lib/message-template-defaults'
import { MessageTemplateEditor } from './message-template-editor'
import type { NotificationEvent } from '@prisma/client'

function parseTemplates(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  return out
}

interface PageProps {
  params: { event: string }
}

export default async function AdminMessageTemplateDetailPage({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const event = params.event as NotificationEvent
  if (!(EDITABLE_NOTIFICATION_EVENTS as readonly string[]).includes(params.event)) {
    notFound()
  }

  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'singleton' },
    select: { messageTemplates: true },
  })
  const map = parseTemplates(settings?.messageTemplates)
  const custom = map[event] ?? ''

  return (
    <>
      <Header title="문자 내용·인자 설정" />
      <main className="flex-1 p-6 overflow-auto max-w-3xl">
        <MessageTemplateEditor
          event={event}
          scenarioLabel={MESSAGE_SCENARIO_LABELS[event]}
          initialCustom={custom}
          defaultTemplate={DEFAULT_MESSAGE_TEMPLATES[event]}
        />
      </main>
    </>
  )
}
