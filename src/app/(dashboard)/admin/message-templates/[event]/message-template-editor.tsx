'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft } from 'lucide-react'
import type { NotificationEvent } from '@prisma/client'

interface Props {
  event: NotificationEvent
  scenarioLabel: string
  /** DB에 저장된 커스텀(없으면 빈 문자열) */
  initialCustom: string
  defaultTemplate: string
}

export function MessageTemplateEditor({
  event,
  scenarioLabel,
  initialCustom,
  defaultTemplate,
}: Props) {
  const router = useRouter()
  const [text, setText] = useState(initialCustom || defaultTemplate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setText(initialCustom || defaultTemplate)
  }, [initialCustom, defaultTemplate, event])

  async function save() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/message-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, template: text.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '저장 실패')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  async function resetToDefault() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/message-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, template: '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '초기화 실패')
      setText(defaultTemplate)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '초기화 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/message-templates"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로
      </Link>

      <div>
        <h2 className="text-lg font-semibold text-gray-900">{scenarioLabel}</h2>
        <p className="text-xs text-gray-500 font-mono mt-1">{event}</p>
      </div>

      <div className="rounded-lg border bg-amber-50/80 border-amber-100 px-3 py-2 text-xs text-amber-900 space-y-1">
        <p>다음 치환자를 본문에 사용할 수 있습니다.</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><code className="bg-white/80 px-1 rounded">{'{{siteName}}'}</code> — 시스템 설정의 사이트명(예: 한국교통안전공단)</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{siteUrl}}'}</code> — 접속 주소만(환경변수 NEXT_PUBLIC_APP_URL 등)</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{siteUrlPhrase}}'}</code> — &quot; https://… 에서 확인 가능합니다.&quot; (주소 없으면 빈 문자열)</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{siteUrlConfirmPhrase}}'}</code> — &quot; https://…에서 확인하세요.&quot; (배정 알림용, 주소 없으면 빈 문자열)</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{assignerLabel}}'}</code> — 배정 실행자 역할(1차 배정자·1차 담당자 등)</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{assignerEmail}}'}</code> — 배정 실행자 이메일</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{assigneeEmail}}'}</code> — 수신 담당자 이메일</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{inviteSignupLine}}'}</code> — 미가입 이메일 배정 시 사용등록 안내 문단(해당 시에만)</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{signupEmail}}'}</code> — 위 안내에 쓸 초대 이메일 주소만</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{receiptLine}}'}</code> — 접수번호 줄(없으면 빈 문자열)</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{titleLine}}'}</code> — 제목 줄(없으면 빈 문자열)</li>
          <li><code className="bg-white/80 px-1 rounded">{'{{tempBlock}}'}</code> — 임시 비밀번호 안내(해당 시에만)</li>
        </ul>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tpl">문자·메일 본문 템플릿</Label>
        <Textarea
          id="tpl"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={loading || !text.trim()}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          저장
        </Button>
        <Button type="button" variant="outline" onClick={() => void resetToDefault()} disabled={loading}>
          기본 문구로 되돌리기
        </Button>
        <Button type="button" variant="ghost" onClick={() => setText(defaultTemplate)} disabled={loading}>
          편집 내용만 기본값으로 채우기
        </Button>
      </div>
    </div>
  )
}
