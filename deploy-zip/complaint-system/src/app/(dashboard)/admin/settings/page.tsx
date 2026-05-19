'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Settings {
  siteName: string
  logoText: string
  primaryColor: string
  accentColor: string
  adminEmail: string
  smsEnabled: boolean
  emailEnabled: boolean
  aligoUserId: string
  aligoSender: string
  /** 입력란 전용 — 서버에서 내려주지 않음. 저장 시에만 전송 */
  aligoApiKeyDraft: string
  hasAligoApiKey: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    siteName: '자율보고 처리 시스템',
    logoText: '자율보고 처리',
    primaryColor: '#2563eb',
    accentColor: '#7c3aed',
    adminEmail: '',
    smsEnabled: false,
    emailEnabled: false,
    aligoUserId: '',
    aligoSender: '',
    aligoApiKeyDraft: '',
    hasAligoApiKey: false,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((data) => {
      setSettings((p) => ({
        ...p,
        ...data,
        aligoApiKeyDraft: '',
        hasAligoApiKey: data.hasAligoApiKey ?? false,
      }))
    })
  }, [])

  function set(key: keyof Settings, value: any) {
    setSettings((p) => ({ ...p, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const { aligoApiKeyDraft, hasAligoApiKey, ...rest } = settings
      const payload: Record<string, unknown> = { ...rest }
      if (aligoApiKeyDraft.trim()) payload.aligoApiKey = aligoApiKeyDraft.trim()
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('저장 실패')
      const savedData = await res.json()
      setSettings((p) => ({
        ...p,
        ...savedData,
        aligoApiKeyDraft: '',
        hasAligoApiKey: savedData.hasAligoApiKey ?? false,
      }))
      setSaved(true)
      // CSS 변수 즉시 적용
      document.documentElement.style.setProperty('--sys-primary', savedData.primaryColor)
      document.documentElement.style.setProperty('--sys-accent', savedData.accentColor)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header title="시스템 설정" />
      <main className="flex-1 p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>사이트 외관</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>사이트명</Label>
                <Input value={settings.siteName} onChange={(e) => set('siteName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>로고 텍스트 (사이드바)</Label>
                <Input value={settings.logoText} onChange={(e) => set('logoText', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Primary 색상</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => set('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => set('primaryColor', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Accent 색상</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => set('accentColor', e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      value={settings.accentColor}
                      onChange={(e) => set('accentColor', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
              {/* 미리보기 */}
              <div className="rounded-lg p-3 text-white text-sm font-medium" style={{ backgroundColor: settings.primaryColor }}>
                색상 미리보기 — {settings.logoText}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>알림 설정</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>관리자 이메일</Label>
                <Input type="email" value={settings.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium text-sm">SMS 알림 (Aligo)</p>
                  <p className="text-xs text-gray-500">발송 시 DB 설정을 우선 사용합니다. 미설정 시 환경변수 ALIGO_*</p>
                </div>
                <Switch checked={settings.smsEnabled} onCheckedChange={(v) => set('smsEnabled', v)} />
              </div>
              <div className="rounded-lg border bg-gray-50/80 p-4 space-y-3">
                <p className="text-sm font-medium text-gray-800">SMS API (Aligo)</p>
                <div className="space-y-1.5">
                  <Label htmlFor="aligo-user-id">Aligo user_id (회원 아이디)</Label>
                  <Input
                    id="aligo-user-id"
                    className="font-mono text-sm"
                    autoComplete="off"
                    value={settings.aligoUserId}
                    onChange={(e) => set('aligoUserId', e.target.value)}
                    placeholder="예: yourcompany"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aligo-sender">발신번호 (Aligo에 등록된 번호)</Label>
                  <Input
                    id="aligo-sender"
                    className="font-mono text-sm"
                    inputMode="tel"
                    autoComplete="off"
                    value={settings.aligoSender}
                    onChange={(e) => set('aligoSender', e.target.value)}
                    placeholder="0212345678 또는 01012345678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aligo-api-key">API Key (apikey)</Label>
                  <Input
                    id="aligo-api-key"
                    type="password"
                    className="font-mono text-sm"
                    autoComplete="new-password"
                    value={settings.aligoApiKeyDraft}
                    onChange={(e) => set('aligoApiKeyDraft', e.target.value)}
                    placeholder={settings.hasAligoApiKey ? '변경할 때만 입력' : 'Aligo 발급 키 입력'}
                  />
                  {settings.hasAligoApiKey && !settings.aligoApiKeyDraft && (
                    <p className="text-xs text-gray-500">키는 저장되어 있습니다. 바꾸려면 새 키를 입력하세요.</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">이메일 알림 (Nodemailer)</p>
                  <p className="text-xs text-gray-500">환경변수 SMTP_HOST 설정 필요</p>
                </div>
                <Switch checked={settings.emailEnabled} onCheckedChange={(v) => set('emailEnabled', v)} />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />설정이 저장되었습니다.
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            저장
          </Button>
        </form>
      </main>
    </>
  )
}
