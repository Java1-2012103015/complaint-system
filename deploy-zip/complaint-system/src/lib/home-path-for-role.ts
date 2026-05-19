import type { Role } from '@prisma/client'

/** 로그인 직후·루트(/) 등에서 역할별 기본 워크스페이스 경로 */
export function homePathForRole(role: Role | undefined): string {
  switch (role) {
    case 'DISTRIBUTOR_1':
      return '/dist1/dashboard'
    case 'DISTRIBUTOR_2':
      return '/dist2/dashboard'
    case 'ADMIN':
      return '/dashboard/admin'
    default:
      return '/dashboard'
  }
}
