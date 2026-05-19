import path from 'path'

/** 프로젝트 루트 (운영: .env 에 PROJECT_ROOT=/var/www/complaint-system 권장) */
export function getProjectRoot(): string {
  const fromEnv = process.env.PROJECT_ROOT?.trim()
  if (fromEnv) return path.resolve(fromEnv)

  const cwd = process.cwd().replace(/\\/g, '/')
  if (cwd.includes('.next/standalone')) {
    return path.resolve(process.cwd(), '..', '..')
  }
  return process.cwd()
}

export function isStandaloneRuntime(): boolean {
  return process.cwd().replace(/\\/g, '/').includes('.next/standalone')
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

/** standalone·프로젝트 루트 등 실제 저장 위치를 순서대로 탐색 */
export function getUploadSearchDirs(): string[] {
  const root = getProjectRoot()
  const primary = getUploadBaseDir()
  const cwdLocal = path.join(process.cwd(), 'public', 'uploads')
  const standaloneDir = path.join(root, '.next', 'standalone', 'public', 'uploads')

  const candidates = isStandaloneRuntime()
    ? [cwdLocal, primary, standaloneDir]
    : [primary, cwdLocal, standaloneDir]

  return Array.from(new Set(candidates.map((p) => path.resolve(p))))
}
