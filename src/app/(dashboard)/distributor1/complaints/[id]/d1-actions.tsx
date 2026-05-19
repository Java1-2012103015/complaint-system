'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AssignModal } from '@/components/admin/assign-modal'
import { RejectModal } from '@/components/admin/reject-modal'
import { UserCheck, RotateCcw } from 'lucide-react'
import type { ComplaintStatus } from '@prisma/client'

interface D1ComplaintActionsProps {
  complaint: {
    id: string
    status: ComplaintStatus
    d2Id: string | null
    d1?: { organizationId: string | null } | null
    d1InviteOrganizationId?: string | null
  }
}

export function D1ComplaintActions({ complaint }: D1ComplaintActionsProps) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const canAssignD2 = ['PENDING', 'AGENCY_ASSIGNED', 'OFFICER_ASSIGNED'].includes(complaint.status)
  const canReject = ['PENDING', 'AGENCY_ASSIGNED', 'OFFICER_ASSIGNED', 'IN_PROGRESS_PLAN', 'IN_PROGRESS_SCHED'].includes(complaint.status)

  return (
    <div className="bg-white rounded-xl border p-4 space-y-2">
      <h2 className="font-semibold text-gray-700">액션</h2>

      <Button
        variant="outline"
        className="w-full justify-start"
        disabled={!canAssignD2}
        onClick={() => setAssignOpen(true)}
      >
        <UserCheck className="w-4 h-4 mr-2" />
        2차 담당자 배정
      </Button>

      <Button
        variant="outline"
        className="w-full justify-start text-red-600 hover:bg-red-50 border-red-200"
        disabled={!canReject}
        onClick={() => setRejectOpen(true)}
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        관리자에게 반려
      </Button>

      <AssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        complaintId={complaint.id}
        level={2}
        d2OrganizationId={complaint.d1?.organizationId ?? complaint.d1InviteOrganizationId ?? null}
      />
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        complaintId={complaint.id}
        actorRole="DISTRIBUTOR_1"
      />
    </div>
  )
}
