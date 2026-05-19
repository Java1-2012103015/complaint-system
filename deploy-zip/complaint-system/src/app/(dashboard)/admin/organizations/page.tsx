import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { OrganizationAdminClient } from './organization-admin-client'

export default async function AdminOrganizationsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const orgs = await prisma.organization.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  })

  return (
    <>
      <Header title="기관 관리" />
      <main className="flex-1 p-6 overflow-auto">
        <p className="text-sm text-gray-600 mb-4">
          가입 시 사용자가 검색하여 선택하는 표준 기관 목록입니다. 비활성화하면 검색 결과에 나오지 않습니다.
        </p>
        <OrganizationAdminClient initialOrgs={orgs as any} />
      </main>
    </>
  )
}
