import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { resolveUploadFile } from '@/lib/resolve-upload-file'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

// GET /uploads/2026/05/xxx.jpg
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const filePath = await resolveUploadFile(params.path ?? [])
  if (!filePath) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const data = await readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  return new NextResponse(data, {
    headers: {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
