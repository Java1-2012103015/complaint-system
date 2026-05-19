import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ThemeInjector } from '@/components/layout/theme-injector'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '자율보고 처리 시스템',
  description: '로컬 자율보고 접수 및 배분 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <ThemeInjector />
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
