import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import {
  EDITABLE_NOTIFICATION_EVENTS,
  MESSAGE_SCENARIO_LABELS,
  DEFAULT_MESSAGE_TEMPLATES,
  hydrateMessageTemplate,
  parseMessageTemplateVariableMeta,
  resolveMessageTemplateVariables,
  isMessageTemplateVariableCustomized,
} from '@/lib/message-template-defaults'
import { publicSiteTitleFromDb } from '@/lib/public-site-title'
import { ChevronRight } from 'lucide-react'
import { MessageTemplateVariablesTable } from '@/components/admin/message-template-variables'

function parseTemplates(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  return out
}

export default async function AdminMessageTemplatesPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'singleton' },
    select: { messageTemplates: true, siteName: true, messageTemplateVariableMeta: true },
  })
  const map = parseTemplates(settings?.messageTemplates)
  const siteTitle = publicSiteTitleFromDb(settings?.siteName)
  const variableMeta = parseMessageTemplateVariableMeta(settings?.messageTemplateVariableMeta)
  const variables = resolveMessageTemplateVariables(variableMeta).map((v) => ({
    ...v,
    isCustomized: isMessageTemplateVariableCustomized(v.key, variableMeta),
  }))

  return (
    <>
      <Header title="문자 내용·인자 설정" />
      <main className="flex-1 p-6 space-y-6 overflow-auto max-w-4xl">
        <MessageTemplateVariablesTable variables={variables} />

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">상황별 문자·메일 템플릿</h3>
          <p className="text-sm text-gray-500 mb-3">
            배정·반려·승인 등 상황마다 사용할 기본 문구입니다. 항목을 눌러 수정할 수 있으며, 발송 직전에 내용을 다시 고칠 수도 있습니다.
          </p>
        </div>

        <div className="bg-white rounded-xl border shadow-sm divide-y">
          {EDITABLE_NOTIFICATION_EVENTS.map((event) => {
            const custom = map[event]
            const template = custom || DEFAULT_MESSAGE_TEMPLATES[event]
            const preview = hydrateMessageTemplate(
              template,
              {
                siteName: siteTitle,
                receiptNumber: '2026-00001',
                title: '예시 제목',
                siteUrl: 'https://example.go.kr',
                signupEmail: '담당자@example.go.kr',
                assignerEmail: 'assigner@naver.com',
                assigneeEmail: 'assignee@naver.com',
              },
              event,
            ).replace(/\n/g, ' ')

            return (
              <Link
                key={event}
                href={`/admin/message-templates/${event}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{MESSAGE_SCENARIO_LABELS[event]}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{event}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{preview}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {custom ? (
                    <span className="text-[10px] uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      사용자 정의
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      기본
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </>
  )
}
