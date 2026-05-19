import { unlink } from 'fs/promises'
import { resolveUploadFile } from '@/lib/resolve-upload-file'

/** DB url (/uploads/2026/05/xxx.jpg) 기준으로 디스크 파일 삭제 */
export async function deleteUploadFileByUrl(url: string): Promise<void> {
  const segments = url.replace(/^\/+/, '').replace(/^uploads\//, '').split('/').filter(Boolean)
  if (segments.length === 0) return

  const filePath = await resolveUploadFile(segments)
  if (!filePath) return

  try {
    await unlink(filePath)
  } catch {
    // 이미 없으면 무시
  }
}
