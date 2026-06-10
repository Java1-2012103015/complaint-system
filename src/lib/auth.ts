import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { SESSION_MAX_AGE_SECONDS } from './session-config'
import type { Role } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    // 활동으로 세션을 갱신하지 않음 — 로그인 시점부터 maxAge 후 만료
    updateAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        login: { label: '아이디', type: 'text' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null

        const raw = credentials.login.trim()
        if (!raw) return null

        const user = await prisma.user.findFirst({
          where: {
            isActive: true,
            loginId: raw,
          },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isTemporary: user.isTemporary,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role as Role
        token.isTemporary = (user as any).isTemporary as boolean
        token.loginAt = Math.floor(Date.now() / 1000)
      }

      const loginAt = token.loginAt
      if (
        typeof loginAt === 'number' &&
        Math.floor(Date.now() / 1000) - loginAt > SESSION_MAX_AGE_SECONDS
      ) {
        return { ...token, exp: 0 }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.isTemporary = token.isTemporary as boolean
      }
      return session
    },
  },
}

export const getSession = () => getServerSession(authOptions)

// next-auth 타입 확장
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      isTemporary: boolean
    }
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    isTemporary: boolean
    loginAt?: number
  }
}
