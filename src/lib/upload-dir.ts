import path from 'path'

/** Next.js standalone(PM2) 실행 시 프로젝트 루트 (/var/www/complaint-system) */
export function getProjectRoot(): string {
  const cwd = process.cwd().replace(/\\/g, '/')
  if (cwd.endsWith('/.next/standalone') || cwd.includes('/.next/standalone/')) {
    return path.resolve(process.cwd(), '..', '..')
  }
  return process.cwd()
}

/** 업로드 저장·조회 기준 경로 (기본: {프로젝트}/public/uploads) */
export function getUploadBaseDir(): string {
  const root = getProjectRoot()
  const configured = process.env.UPLOAD_DIR?.trim()
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(root, configured.replace(/^\.\//, ''))
  }
  return path.join(root, 'public', 'uploads')
}

/** standalone 등 예전에 저장된 파일까지 찾기 위한 후보 경로 */
export function getUploadSearchDirs(): string[] {
  const primary = getUploadBaseDir()
  const cwd = process.cwd()
  const candidates = [
    primary,
    path.join(cwd, 'public', 'uploads'),
    path.join(getProjectRoot(), '.next', 'standalone', 'public', 'uploads'),
  ]
  return Array.from(new Set(candidates.map((p) => path.resolve(p))))
}
