'use client'

import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFFirstPageProps {
  url: string
}

export default function PDFFirstPage({ url }: PDFFirstPageProps) {
  return (
    <div className="border rounded overflow-hidden">
      <Document file={url} loading={<div className="h-40 bg-gray-100 animate-pulse" />}>
        <Page pageNumber={1} width={248} renderTextLayer={false} renderAnnotationLayer={false} />
      </Document>
    </div>
  )
}
