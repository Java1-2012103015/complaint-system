'use client'

import { useSession } from 'next-auth/react'
import { AlertTriangle, LogOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { signOutAndHardNavigate } from '@/lib/sign-out-client'
import { ROLE_LABELS } from '@/types'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        {session?.user.isTemporary && (
          <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            임시 비밀번호 — 변경 필요
          </div>
        )}
        <Badge variant="secondary" className="text-xs">
          {session?.user.role ? ROLE_LABELS[session.user.role] : ''}
        </Badge>
        <span className="text-sm text-gray-600">{session?.user.name}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void signOutAndHardNavigate('/login')}
          className="text-gray-600 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </Button>
      </div>
    </header>
  )
}
