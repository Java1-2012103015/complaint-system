'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type CheckState = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid'

interface LoginIdAvailabilityFieldProps {
  id?: string
  label?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  /** 관리자가 사용자 수정 시: 이 사용자의 기존 아이디는 사용 가능으로 처리 */
  excludeUserId?: string | null
  /** 중복확인으로 현재 입력값이 검증된 상태인지 */
  onVerifiedChange?: (verified: boolean) => void
}

export function LoginIdAvailabilityField({
  id = 'loginId',
  label = '아이디',
  value,
  onChange,
  required,
  excludeUserId,
  onVerifiedChange,
}: LoginIdAvailabilityFieldProps) {
  const [state, setState] = useState<CheckState>('idle')
  const [msg, setMsg] = useState('')
  const [checkedFor, setCheckedFor] = useState<string | null>(null)

  const onVerifiedRef = useRef(onVerifiedChange)
  onVerifiedRef.current = onVerifiedChange

  useEffect(() => {
    if (checkedFor !== null && value.trim() !== checkedFor) {
      setState('idle')
      setMsg('')
      setCheckedFor(null)
      onVerifiedRef.current?.(false)
    }
  }, [value, checkedFor])

  async function handleCheck() {
    const v = value.trim()
    setMsg('')
    if (!v) {
      setState('invalid')
      setMsg('아이디를 입력하세요.')
      onVerifiedChange?.(false)
      return
    }

    setState('checking')
    try {
      const qs = new URLSearchParams({ loginId: v })
      if (excludeUserId) qs.set('excludeUserId', excludeUserId)
      const res = await fetch(`/api/auth/check-login-id?${qs}`)
      const data = await res.json()

      if (!res.ok) {
        setState('invalid')
        setMsg(data.message || '확인에 실패했습니다.')
        setCheckedFor(null)
        onVerifiedChange?.(false)
        return
      }

      if (data.available) {
        setState('ok')
        setMsg(data.message || '사용 가능한 아이디입니다.')
        setCheckedFor(v)
        onVerifiedChange?.(true)
      } else if (data.valid === false) {
        setState('invalid')
        setMsg(data.message || '형식이 올바르지 않습니다.')
        setCheckedFor(null)
        onVerifiedChange?.(false)
      } else {
        setState('taken')
        setMsg(data.message || '이미 사용 중입니다.')
        setCheckedFor(null)
        onVerifiedChange?.(false)
      }
    } catch {
      setState('invalid')
      setMsg('네트워크 오류로 확인할 수 없습니다.')
      setCheckedFor(null)
      onVerifiedChange?.(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="영문·숫자·_ 4~32자"
          required={required}
          autoComplete="username"
          className="flex-1"
        />
        <Button type="button" variant="secondary" className="shrink-0" onClick={handleCheck} disabled={state === 'checking'}>
          {state === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : '중복확인'}
        </Button>
      </div>
      {msg && (
        <p
          className={cn(
            'text-xs',
            state === 'ok' && 'text-green-600',
            (state === 'taken' || state === 'invalid') && 'text-destructive',
            state === 'checking' && 'text-muted-foreground'
          )}
        >
          {msg}
        </p>
      )}
    </div>
  )
}
