'use client'

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { formatFileSize } from '@/lib/utils'
import { FileText, Image as ImageIcon, ExternalLink, X, Loader2 } from 'lucide-react'
import { Suspense, lazy } from 'react'
import type { FileItem } from '@/types'

const PDFFirstPage = lazy(() => import('./pdf-first-page'))

interface FilePreviewProps {
  file: FileItem
  onDelete?: () => void
  deleting?: boolean
}

export function FilePreview({ file, onDelete, deleting }: FilePreviewProps) {
  const isImage = file.mimeType.startsWith('image/')
  const isPdf = file.mimeType === 'application/pdf'

  return (
    <div className="inline-flex items-center gap-0.5 max-w-full">
      <HoverCard openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline min-w-0"
          >
            {isPdf ? <FileText className="w-4 h-4 shrink-0" /> : <ImageIcon className="w-4 h-4 shrink-0" />}
            <span className="truncate max-w-[200px]">{file.originalName}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
          </a>
        </HoverCardTrigger>
        <HoverCardContent className="w-72 p-2" side="right">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 truncate">{file.originalName}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>

            {isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.url}
                alt={file.originalName}
                className="w-full max-h-48 object-contain rounded border"
              />
            )}

            {isPdf && (
              <Suspense fallback={<div className="h-40 bg-gray-100 rounded animate-pulse" />}>
                <PDFFirstPage url={file.url} />
              </Suspense>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>

      {onDelete && (
        <button
          type="button"
          disabled={deleting}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
          }}
          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 shrink-0"
          aria-label={`${file.originalName} 삭제`}
          title="삭제"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}
