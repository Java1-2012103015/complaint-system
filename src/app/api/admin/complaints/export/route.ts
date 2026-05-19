import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildCsv } from '@/lib/csv'
import { buildAdminComplaintWhere } from '@/lib/admin-complaint-where'
import { STATUS_LABELS } from '@/types'
import type { ComplaintStatus } from '@prisma/client'

const MAX_EXPORT = 50_000

function formatCsvDate(date: Date | null): string {
  if (!date) return ''
  return date.toISOString().slice(0, 10)
}

function formatCsvDateTime(date: Date): string {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// GET /api/admin/complaints/export?status=&search=&showPii=true
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') as ComplaintStatus | null
  const search = searchParams.get('search') || ''
  const showPii = searchParams.get('showPii') !== 'false'

  const where = buildAdminComplaintWhere({
    status: status || undefined,
    search,
  })

  const total = await prisma.complaint.count({ where })
  if (total > MAX_EXPORT) {
    return NextResponse.json(
      { error: `보내기는 최대 ${MAX_EXPORT.toLocaleString()}건까지 가능합니다. 검색·필터로 범위를 줄여 주세요.` },
      { status: 400 },
    )
  }

  const items = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      receiptNumber: true,
      title: true,
      category: true,
      address: true,
      status: true,
      scheduledDate: true,
      createdAt: true,
      updatedAt: true,
      complainantName: true,
      complainantPhone: true,
      complainantEmail: true,
      complainantAddr: true,
      d1: { select: { name: true, department: true, team: true } },
      d2: { select: { name: true, department: true, team: true } },
      _count: { select: { files: true } },
    },
  })

  const baseHeaders = [
    '접수번호',
    '제목',
    '유형',
    '현장주소',
    '상태',
  ]
  const piiHeaders = showPii
    ? ['접수자', '연락처', '이메일', '접수자주소']
    : []
  const tailHeaders = [
    '1차담당',
    '1차부서',
    '1차팀',
    '2차담당',
    '2차부서',
    '2차팀',
    '발생일자',
    '접수일시',
    '수정일시',
    '첨부파일수',
  ]
  const headers = [...baseHeaders, ...piiHeaders, ...tailHeaders]

  const rows = items.map((item) => {
    const base = [
      item.receiptNumber,
      item.title,
      item.category ?? '',
      item.address ?? '',
      STATUS_LABELS[item.status],
    ]
    const pii = showPii
      ? [
          item.complainantName ?? '',
          item.complainantPhone ?? '',
          item.complainantEmail ?? '',
          item.complainantAddr ?? '',
        ]
      : []
    const tail = [
      item.d1?.name ?? '',
      item.d1?.department ?? '',
      item.d1?.team ?? '',
      item.d2?.name ?? '',
      item.d2?.department ?? '',
      item.d2?.team ?? '',
      formatCsvDate(item.scheduledDate),
      formatCsvDateTime(item.createdAt),
      formatCsvDateTime(item.updatedAt),
      item._count.files,
    ]
    return [...base, ...pii, ...tail]
  })

  const csv = buildCsv(headers, rows)
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `complaints_${stamp}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
