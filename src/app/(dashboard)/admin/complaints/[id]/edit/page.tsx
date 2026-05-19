import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { ComplaintEditForm } from './complaint-edit-form'

interface PageProps {
  params: { id: string }
}

export default async function AdminComplaintEditPage({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      receiptNumber: true,
      title: true,
      content: true,
      category: true,
      address: true,
      scheduledDate: true,
      complainantName: true,
      complainantPhone: true,
      complainantEmail: true,
      complainantAddr: true,
      files: {
        orderBy: { uploadedAt: 'asc' },
        select: {
          id: true,
          originalName: true,
          url: true,
          mimeType: true,
          size: true,
          uploadedAt: true,
        },
      },
    },
  })

  if (!complaint) notFound()

  const scheduledDateStr = complaint.scheduledDate
    ? complaint.scheduledDate.toISOString().slice(0, 10)
    : ''

  return (
    <>
      <Header title="자율보고 수정" />
      <main className="flex-1 p-6 max-w-3xl">
        <ComplaintEditForm
          complaint={{
            ...complaint,
            scheduledDate: scheduledDateStr,
            files: complaint.files.map((f) => ({
              ...f,
              uploadedAt: f.uploadedAt,
            })),
          }}
        />
      </main>
    </>
  )
}
