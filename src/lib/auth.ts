import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import type { Role } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    // 초 단위. 미설정 시 30일. 짧게 하려면 예: NEXTAUTH_SESSION_MAX_AGE=86400 (24시간)
    maxAge:
      process.env.NEXTAUTH_SESSION_MAX_AGE &&
      !Number.isNaN(Number(process.env.NEXTAUTH_SESSION_MAX_AGE))
        ? Number(process.env.NEXTAUTH_SESSION_MAX_AGE)
        : 30 * 24 * 60 * 60,
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
  }
}
