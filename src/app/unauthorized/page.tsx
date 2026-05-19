import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <ShieldX className="w-12 h-12 text-red-400 mx-auto" />
        <h1 className="text-xl font-semibold text-gray-800">접근 권한이 없습니다</h1>
        <p className="text-gray-500 text-sm">이 페이지에 접근할 권한이 없습니다.</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
