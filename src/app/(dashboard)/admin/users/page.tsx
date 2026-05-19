import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { formatDateTime } from '@/lib/utils'
import { UserManagementActions } from './user-actions'
import { UserTableRow } from '@/components/admin/user-table-row'

const userSelect = {
  id: true,
  email: true,
  loginId: true,
  name: true,
  role: true,
  department: true,
  team: true,
  createdAt: true,
  organization: { select: { name: true } },
} as const

export default async function AdminUsersPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const [activeUsers, pendingUsers] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        ...userSelect,
        isTemporary: true,
        _count: { select: { d1Complaints: true, d2Complaints: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.user.findMany({
      where: { isActive: false },
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  function orgDeptTeam(u: {
    organization: { name: string } | null
    department: string | null
    team: string | null
  }) {
    const parts = [u.organization?.name, u.department, u.team].filter(Boolean)
    return parts.length ? parts.join(' · ') : '-'
  }

  return (
    <>
      <Header title="사용자 관리" />
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {pendingUsers.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-amber-200">
              <h2 className="font-semibold text-amber-800 text-sm">
                가입 승인 대기 ({pendingUsers.length}명)
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-amber-700 uppercase border-b border-amber-100">
                  <th className="px-4 py-2 text-left">이름</th>
                  <th className="px-4 py-2 text-left">아이디</th>
                  <th className="px-4 py-2 text-left">이메일</th>
                  <th className="px-4 py-2 text-left">기관·부서·팀</th>
                  <th className="px-4 py-2 text-left">신청일</th>
                  <th className="px-4 py-2 text-center">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {pendingUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5 font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{u.loginId || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                    <td className="px-4 py-2.5 text-gray-500">{orgDeptTeam(u)}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateTime(u.createdAt)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <UserManagementActions mode="approve" userId={u.id} userName={u.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">등록 사용자 ({activeUsers.length}명)</h2>
            <UserManagementActions mode="create" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left min-w-[10rem] whitespace-nowrap">이름</th>
                  <th className="px-4 py-3 text-left min-w-[6.5rem] whitespace-nowrap">아이디</th>
                  <th className="px-4 py-3 text-left min-w-[12rem] whitespace-nowrap">이메일</th>
                  <th className="px-4 py-3 text-left min-w-[8.5rem] whitespace-nowrap w-[8.5rem]">역할</th>
                  <th className="px-4 py-3 text-left min-w-[11rem]">기관·부서·팀</th>
                  <th className="px-4 py-3 text-center min-w-[5.5rem] whitespace-nowrap">담당 자율보고</th>
                  <th className="px-4 py-3 text-left min-w-[9rem] whitespace-nowrap">등록일</th>
                  <th className="px-4 py-3 text-right min-w-[10rem] whitespace-nowrap">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeUsers.map((u) => (
                  <UserTableRow
                    key={u.id}
                    user={{
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      loginId: u.loginId,
                      role: u.role,
                      isTemporary: u.isTemporary,
                      createdAtLabel: formatDateTime(u.createdAt),
                      orgDeptTeam: orgDeptTeam(u),
                      complaintCount: u._count.d1Complaints + u._count.d2Complaints,
                    }}
                    currentUserId={session.user.id}
                    d1Count={u._count.d1Complaints}
                    d2Count={u._count.d2Complaints}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
