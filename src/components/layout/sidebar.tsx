'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { signOutAndHardNavigate } from '@/lib/sign-out-client'
import { homePathForRole } from '@/lib/home-path-for-role'
import { Suspense, useState } from 'react'
import { cn } from '@/lib/cn'
import type { Role } from '@prisma/client'
import {
  LayoutDashboard, FileText, Users, Settings,
  ClipboardList, CheckCircle, LogOut, Menu, X,
  ClipboardCheck, Building2, MessageSquare, FilePenLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const adminNav: NavItem[] = [
  { href: '/dashboard/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/users', label: '계정 관리', icon: Users },
  { href: '/admin/organizations', label: '기관 관리', icon: Building2 },
  { href: '/admin/messages', label: '메시지 관리', icon: MessageSquare },
  { href: '/admin/message-templates', label: '문자 내용·인자 설정', icon: FilePenLine },
  { href: '/admin/complaints?status=PENDING', label: '자율보고 배정(1차)', icon: ClipboardCheck },
  { href: '/admin/complaints/new', label: '자율보고 등록', icon: ClipboardList },
  { href: '/admin/complaints', label: '전체 자율보고', icon: FileText },
  { href: '/admin/settings', label: '시스템 설정', icon: Settings },
]

const d1Nav: NavItem[] = [
  { href: '/dist1/dashboard', label: '내 담당 자율보고', icon: LayoutDashboard },
]

const d2Nav: NavItem[] = [
  { href: '/dist2/dashboard', label: '내 처리 자율보고', icon: CheckCircle },
]

export function Sidebar() {
  return (
    <Suspense
      fallback={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-50 md:hidden shadow bg-white"
            disabled
            aria-hidden
          >
            <Menu className="w-5 h-5" />
          </Button>
          <aside className="hidden md:flex w-64 min-h-screen bg-white border-r shrink-0" aria-hidden />
        </>
      }
    >
      <SidebarContent />
    </Suspense>
  )
}

function SidebarContent() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  const navItems =
    session?.user.role === 'ADMIN' ? adminNav :
    session?.user.role === 'DISTRIBUTOR_1' ? d1Nav : d2Nav

  const homeHref = session?.user?.role
    ? homePathForRole(session.user.role as Role)
    : '/dashboard'

  const roleLabel =
    session?.user.role === 'ADMIN' ? '관리자' :
    session?.user.role === 'DISTRIBUTOR_1' ? '1차 배분자' : '2차 담당자'

  function isActive(href: string) {
    const [path, queryString] = href.split('?')
    const expectedQuery = new URLSearchParams(queryString || '')

    if (path === '/dashboard/admin') {
      return pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/')
    }

    if (path === '/dist1/dashboard' || path === '/dist2/dashboard') {
      return pathname === path
    }

    if (path === '/admin/complaints/new') {
      return pathname === '/admin/complaints/new'
    }

    if (path === '/admin/complaints') {
      if (pathname !== '/admin/complaints') return false
      if (expectedQuery.get('status')) {
        return searchParams.get('status') === expectedQuery.get('status')
      }
      return !searchParams.get('status')
    }

    if (
      path === '/admin/messages'
      || path === '/admin/message-templates'
      || path === '/admin/users'
      || path === '/admin/organizations'
      || path === '/admin/settings'
    ) {
      return pathname === path || pathname.startsWith(`${path}/`)
    }

    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const content = (
    <div className="flex flex-col h-full">
      {/* 로고 → 역할별 메인 */}
      <Link
        href={homeHref}
        onClick={() => setOpen(false)}
        className="px-6 py-4 flex items-center justify-between border-b text-white font-bold text-lg tracking-tight hover:brightness-110 transition-[filter]"
        style={{ backgroundColor: 'var(--sys-primary, #2563eb)' }}
      >
        자율보고 처리시스템
      </Link>

      {/* 사용자 정보 */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <p className="text-sm font-semibold text-gray-900 truncate">{session?.user.name}</p>
        <p className="text-xs text-gray-500">{roleLabel}</p>
        {session?.user.isTemporary && (
          <p className="text-xs text-amber-600 mt-0.5 font-medium">⚠ 임시 비밀번호 변경 필요</p>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              style={active ? { backgroundColor: 'var(--sys-primary, #2563eb)' } : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* 하단 */}
      <div className="px-3 py-4 border-t">
        <button
          onClick={() => void signOutAndHardNavigate('/login')}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* 모바일 버튼 */}
      <Button
        variant="ghost" size="icon"
        className="fixed top-3 left-3 z-50 md:hidden shadow bg-white"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-200 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {content}
      </aside>

      {/* 데스크탑 */}
      <aside className="hidden md:flex md:flex-col w-64 min-h-screen bg-white border-r shrink-0">
        {content}
      </aside>
    </>
  )
}
