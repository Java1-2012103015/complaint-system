'use client'

import { SessionProvider } from 'next-auth/react'
import { SessionExpiryGuard } from '@/components/providers/session-expiry-guard'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth" refetchInterval={30} refetchOnWindowFocus>
      <SessionExpiryGuard />
      {children}
    </SessionProvider>
  )
}
