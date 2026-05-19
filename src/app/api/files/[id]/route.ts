import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteUploadFileByUrl } from '@/lib/delete-upload-file'

// DELETE /api/files/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const file = await prisma.complaintFile.findUnique({
    where: { id: params.id },
    include: {
      complaint: { select: { id: true, d1Id: true, d2Id: true } },
    },
  })
  if (!file) {
    return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
  }

  const { role, id: uid } = session.user
  const allowed =
    role === 'ADMIN' ||
    file.complaint.d1Id === uid ||
    file.complaint.d2Id === uid
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await deleteUploadFileByUrl(file.url)
  await prisma.complaintFile.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
