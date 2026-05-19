/**
 * standalone 빌드 후 public/uploads 를 standalone/public/uploads 에 연결
 * (cp -r public 으로 업로드 폴더가 지워지는 것 방지)
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const uploadsDir = path.join(root, 'public', 'uploads')
const standalonePublic = path.join(root, '.next', 'standalone', 'public')
const linkPath = path.join(standalonePublic, 'uploads')

if (!fs.existsSync(path.join(root, '.next', 'standalone', 'server.js'))) {
  console.log('[link-uploads] standalone 빌드 없음 — 건너뜀')
  process.exit(0)
}

fs.mkdirSync(uploadsDir, { recursive: true })
fs.mkdirSync(standalonePublic, { recursive: true })

try {
  const stat = fs.lstatSync(linkPath)
  if (stat.isSymbolicLink() || stat.isDirectory()) {
    fs.rmSync(linkPath, { recursive: true, force: true })
  }
} catch {
  // 없음
}

const target = path.relative(path.dirname(linkPath), uploadsDir)
fs.symlinkSync(target, linkPath, 'dir')
console.log(`[link-uploads] ${linkPath} -> ${uploadsDir}`)
