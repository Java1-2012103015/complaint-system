import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveUploadedFile } from '@/lib/file-upload'

// POST /api/upload?complaintId=xxx
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const complaintId = req.nextUrl.searchParams.get('complaintId')
  if (!complaintId) return NextResponse.json({ error: 'complaintId is required' }, { status: 400 })

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: { id: true, d1Id: true, d2Id: true },
  })
  if (!complaint) return NextResponse.json({ error: '자율보고를 찾을 수 없습니다.' }, { status: 404 })

  const { role, id: uid } = session.user
  const allowed =
    role === 'ADMIN' || complaint.d1Id === uid || complaint.d2Id === uid
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (!files.length) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

  const results = []
  const errors = []

  for (const file of files) {
    try {
      const uploaded = await saveUploadedFile(file)
      const record = await prisma.complaintFile.create({
        data: {
          complaintId,
          originalName: uploaded.originalName,
          storedName: uploaded.storedName,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
          url: uploaded.url,
        },
      })
      results.push(record)
    } catch (err: any) {
      errors.push({ name: file.name, error: err.message })
    }
  }

  return NextResponse.json({ success: results, errors })
}
