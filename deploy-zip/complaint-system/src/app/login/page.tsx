'use client'

import { Suspense, useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Role } from '@prisma/client'
import { homePathForRole } from '@/lib/home-path-for-role'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, BarChart3 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function safeInternalCallback(raw: string | null): string | null {
    if (!raw) return null
    const t = decodeURIComponent(raw).trim()
    if (!t.startsWith('/') || t.startsWith('//')) return null
    return t
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', { login, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    const explicit = safeInternalCallback(searchParams.get('callbackUrl'))
    const session = await getSession()
    const role = session?.user?.role as Role | undefined
    const next = explicit ?? homePathForRole(role)

    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2"
            style={{ backgroundColor: 'var(--sys-primary, #2563eb)' }}
          >
            자
          </div>
          <CardTitle className="text-2xl">자율보고 처리 시스템</CardTitle>
          <CardDescription>담당자 전용 로그인</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">아이디</Label>
              <Input
                id="login"
                type="text"
                placeholder="아이디를 입력하세요"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password" type="password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              로그인
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center text-sm text-gray-500">
            <p>
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-blue-600 hover:underline font-medium">
                담당자 가입 신청
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <Link
        href="/dashboard/all"
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <BarChart3 className="w-4 h-4" />
        자율보고 처리 현황 공개 페이지 보기
      </Link>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-label="로딩 중" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
