'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AssignModal } from '@/components/admin/assign-modal'
import { AdminComplaintDeleteButton } from '@/components/admin/admin-complaint-delete-button'
import Link from 'next/link'
import { UserPlus, UserCheck, Pencil } from 'lucide-react'
import type { ComplaintStatus } from '@prisma/client'

type AssigneePreview = {
  name: string
  email?: string | null
  department: string | null
  organizationId: string | null
  organization?: { name: string } | null
} | null

interface ComplaintActionsProps {
  complaint: {
    id: string
    receiptNumber: string
    title: string
    status: ComplaintStatus
    d1Id: string | null
    d2Id: string | null
    d1InviteEmail: string | null
    d1InviteOrganizationId: string | null
    d2InviteEmail: string | null
    d1?: AssigneePreview
    d2?: AssigneePreview
  }
}

function formatAssignedLine(u: AssigneePreview) {
  if (!u) return '미배정'
  const parts = [u.organization?.name, u.department, u.name].filter(Boolean)
  const line = parts.length ? parts.join(' · ') : u.name
  return u.email ? `${line} · ${u.email}` : line
}

export function ComplaintActions({ complaint }: ComplaintActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [assignLevel, setAssignLevel] = useState<1 | 2 | null>(null)

  const isCompleted = complaint.status === 'COMPLETED'
  const hasD1Context = !!(complaint.d1Id || complaint.d1InviteOrganizationId)
  const canAssignD2 =
    hasD1Context &&
    (['PENDING', 'AGENCY_ASSIGNED', 'OFFICER_ASSIGNED'].includes(complaint.status) || isCompleted)

  useEffect(() => {
    if (searchParams.get('assign') !== '1') return
    if (complaint.status === 'PENDING') {
      setAssignLevel(1)
    }
    router.replace(pathname, { scroll: false })
  }, [searchParams, pathname, router, complaint.status])

  return (
    <div className="bg-white rounded-xl border p-4 space-y-2">
      <h2 className="font-semibold text-gray-700">관리자 액션</h2>

      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setAssignLevel(1)}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        {isCompleted ? '1차 담당 배정·변경(처리완료)' : '1차 담당 배정·변경'}
      </Button>

      <Button
        variant="outline"
        className="w-full justify-start"
        disabled={!canAssignD2}
        onClick={() => setAssignLevel(2)}
      >
        <UserCheck className="w-4 h-4 mr-2" />
        {isCompleted ? '2차 담당 배정(처리완료)' : '2차 담당 배정'}
      </Button>

      {isCompleted && (
        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 space-y-1.5">
          <p>
            <span className="text-gray-500">1차 담당</span>
            <span className="mx-1 text-gray-300">|</span>
            {complaint.d1
              ? formatAssignedLine(complaint.d1)
              : complaint.d1InviteEmail
                ? `${complaint.d1InviteEmail} (가입 대기)`
                : '미배정'}
          </p>
          <p>
            <span className="text-gray-500">2차 담당</span>
            <span className="mx-1 text-gray-300">|</span>
            {complaint.d2
              ? formatAssignedLine(complaint.d2)
              : complaint.d2InviteEmail
                ? `${complaint.d2InviteEmail} (가입 대기)`
                : '미배정'}
          </p>
        </div>
      )}

      <div className="pt-2 border-t">
        <p className="text-xs text-gray-500 mb-2">위험 구역</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="justify-start text-gray-700 border-gray-200" asChild>
            <Link href={`/admin/complaints/${complaint.id}/edit`}>
              <Pencil className="w-4 h-4 mr-2" />
              수정
            </Link>
          </Button>
          <AdminComplaintDeleteButton
            complaintId={complaint.id}
            receiptNumber={complaint.receiptNumber}
            title={complaint.title}
          />
        </div>
      </div>

      {assignLevel && (
        <AssignModal
          open={!!assignLevel}
          onClose={() => setAssignLevel(null)}
          complaintId={complaint.id}
          level={assignLevel}
          d2OrganizationId={
            assignLevel === 2
              ? (complaint.d1?.organizationId ?? complaint.d1InviteOrganizationId ?? null)
              : undefined
          }
        />
      )}
    </div>
  )
}
