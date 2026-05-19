import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateReceiptNumber } from '@/lib/utils'

// POST /api/complaints/bulk - 붙여넣기 파싱 데이터 일괄 등록
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { rows } = body as { rows: Array<Record<string, string>> }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: '등록할 데이터가 없습니다.' }, { status: 400 })
  }

  const created = await prisma.$transaction(
    rows.map((row) =>
      prisma.complaint.create({
        data: {
          receiptNumber: row['접수번호'] || generateReceiptNumber(),
          title: row['제목'] || row['민원내용'] || row['자율보고내용'] || '(제목 없음)',
          content: row['내용'] || row['민원내용'] || row['자율보고내용'] || '',
          category: row['유형'] || row['민원유형'] || row['자율보고유형'] || null,
          address: row['주소'] || row['현장주소'] || null,
          complainantName: row['신청인'] || row['접수자'] || null,
          complainantPhone: row['연락처'] || row['전화번호'] || null,
          scheduledDate:
            row['발생일자'] || row['처리기한']
              ? new Date((row['발생일자'] || row['처리기한']) as string)
              : null,
          rawData: JSON.stringify(row),
        },
      })
    )
  )

  return NextResponse.json({ count: created.length, ids: created.map((c) => c.id) }, { status: 201 })
}
