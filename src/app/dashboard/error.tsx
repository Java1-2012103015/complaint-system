'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
      <p className="text-lg font-semibold text-gray-900">공개 현황을 불러오지 못했습니다.</p>
      <p className="text-sm text-gray-600 max-w-md">
        개발 중에는 청크·스타일이 꼬일 수 있습니다. 개발 서버를 재시작하고(터미널에서 Ctrl+C 후{' '}
        <code className="bg-gray-200 px-1 rounded">npm run dev</code>), 브라우저에서 강력 새로고침(Ctrl+Shift+R)을 해 보세요.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        다시 시도
      </button>
    </div>
  )
}
