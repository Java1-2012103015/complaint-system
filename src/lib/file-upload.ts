import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_BASE = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')
const MAX_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
])

export interface UploadResult {
  originalName: string
  storedName: string
  mimeType: string
  size: number
  url: string
}

export async function saveUploadedFile(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`허용되지 않는 파일 형식입니다: ${file.type}`)
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`파일 크기가 초과되었습니다 (최대 ${process.env.MAX_FILE_SIZE_MB || 20}MB)`)
  }

  const today = new Date()
  const yearMonth = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}`
  const dirPath = path.join(UPLOAD_BASE, yearMonth)

  await mkdir(dirPath, { recursive: true })

  const ext = path.extname(file.name).toLowerCase() || mimeToExt(file.type)
  const storedName = `${uuidv4()}${ext}`
  const filePath = path.join(dirPath, storedName)

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  return {
    originalName: file.name,
    storedName,
    mimeType: file.type,
    size: file.size,
    url: `/uploads/${yearMonth}/${storedName}`,
  }
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  }
  return map[mime] || ''
}
