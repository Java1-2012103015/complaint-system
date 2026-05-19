'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PasteImportModal } from '@/components/complaints/paste-import-modal'
import { Plus, ClipboardPaste } from 'lucide-react'
import Link from 'next/link'

export function AdminComplaintsActions() {
  const [pasteOpen, setPasteOpen] = useState(false)

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setPasteOpen(true)}>
        <ClipboardPaste className="w-4 h-4 mr-2" />
        붙여넣기 등록
      </Button>
      <Button asChild>
        <Link href="/admin/complaints/new">
          <Plus className="w-4 h-4 mr-2" />
          자율보고 등록
        </Link>
      </Button>
      <PasteImportModal open={pasteOpen} onClose={() => setPasteOpen(false)} />
    </div>
  )
}
