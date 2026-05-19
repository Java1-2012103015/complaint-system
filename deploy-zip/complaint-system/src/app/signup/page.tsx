'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { OrgSearchCombobox } from '@/components/orgs/org-search-combobox'
import { LoginIdAvailabilityField } from '@/components/auth/login-id-availability-field'

export default function SignupPage() {
  const router = useRouter()
  const [loginIdVerified, setLoginIdVerified] = useState(false)
  const [form, setForm] = useState({
    name: '',
    loginId: '',
    email: '',
    organizationId: null as string | null,
    organizationName: '',
    department: '',
    team: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (form.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (!form.organizationId) {
      setError('기관을 검색하여 선택해 주세요.')
      return
    }
    if (!loginIdVerified) {
      setError('아이디 중복확인을 완료해 주세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          loginId: form.loginId.trim(),
          email: form.email,
          organizationId: form.organizationId,
          department: form.department.trim() || undefined,
          team: form.team.trim() || undefined,
          password: form.password,
        }),
      })
      const raw = await res.text()
      let data: { error?: string } = {}
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as { error?: string }
        } catch {
          throw new Error(`서버 응답을 해석할 수 없습니다. (${res.status})`)
        }
      }
      if (!res.ok) throw new Error(data.error || `가입 실패 (${res.status})`)
      setDone(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-semibold">가입 신청 완료</h2>
            <p className="text-sm text-gray-500">관리자 승인 후 로그인하실 수 있습니다.</p>
            <Button onClick={() => router.push('/login')} className="w-full">로그인 페이지로</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2"
            style={{ backgroundColor: 'var(--sys-primary, #2563eb)' }}
          >
            자
          </div>
          <CardTitle className="text-2xl">담당자 회원가입</CardTitle>
          <CardDescription>
            담당자 계정을 신청합니다. 관리자가 배정·초대한 이메일이면 가입 후 해당 자율보고에 자동으로 연결됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>이름 *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>

            <LoginIdAvailabilityField
              value={form.loginId}
              onChange={(v) => setForm((p) => ({ ...p, loginId: v }))}
              required
              onVerifiedChange={setLoginIdVerified}
            />
            <div className="space-y-1.5">
              <Label>이메일 *</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>

            <OrgSearchCombobox
              id="org-signup"
              label="기관"
              required
              valueId={form.organizationId}
              valueName={form.organizationName}
              onChange={(id, name) => setForm((p) => ({ ...p, organizationId: id, organizationName: name }))}
              hint="관리자가 등록한 기관만 선택할 수 있습니다."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>부서</Label>
                <Input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="예: 수질관리과" />
              </div>
              <div className="space-y-1.5">
                <Label>팀</Label>
                <Input value={form.team} onChange={(e) => set('team', e.target.value)} placeholder="소속 팀을 입력하세요" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>비밀번호 *</Label>
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-1.5">
              <Label>비밀번호 확인 *</Label>
              <Input type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} required />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              가입 신청
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">로그인</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
