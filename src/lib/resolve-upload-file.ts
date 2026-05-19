import { stat } from 'fs/promises'
import path from 'path'
import { getUploadSearchDirs } from '@/lib/upload-dir'

export async function resolveUploadFile(segments: string[]): Promise<string | null> {
  if (segments.length === 0 || segments.some((s) => s === '..' || s.includes('\0'))) {
    return null
  }

  for (const base of getUploadSearchDirs()) {
    const resolvedBase = path.resolve(base)
    const filePath = path.join(resolvedBase, ...segments)
    const resolvedFile = path.resolve(filePath)
    if (
      !resolvedFile.startsWith(resolvedBase + path.sep) &&
      resolvedFile !== resolvedBase
    ) {
      continue
    }
    try {
      const info = await stat(resolvedFile)
      if (info.isFile()) return resolvedFile
    } catch {
      // try next base
    }
  }
  return null
}
