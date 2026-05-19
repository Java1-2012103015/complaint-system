'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { parsePastedText } from '@/lib/utils'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PasteImportModalProps {
  open: boolean
  onClose: () => void
}

const EXPECTED_COLS = ['접수번호', '제목', '내용', '유형', '주소', '신청인', '연락처', '발생일자']

export function PasteImportModal({ open, onClose }: PasteImportModalProps) {
  const router = useRouter()
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<Array<Record<string, string>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ count: number } | null>(null)
  const [error, setError] = useState('')

  function handleParse() {
    setError('')
    const rows = parsePastedText(raw)
    if (rows.length === 0) {
      setError('파싱된 데이터가 없습니다. 첫 줄에 헤더(탭/쉼표/파이프 구분)가 있는지 확인하세요.')
      return
    }
    setParsed(rows)
  }

  async function handleImport() {
    if (!parsed) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/complaints/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '등록 실패')
      setResult({ count: data.count })
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setRaw('')
    setParsed(null)
    setResult(null)
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>자율보고 데이터 붙여넣기 등록</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-lg font-medium">{result.count}건 등록 완료</p>
            <Button onClick={handleClose}>닫기</Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* 안내 */}
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-medium mb-1">붙여넣기 형식 안내</p>
                <p>첫 줄은 헤더, 이후 각 줄이 1건의 자율보고 데이터입니다.</p>
                <p>권장 컬럼명: <code className="bg-blue-100 px-1 rounded">{EXPECTED_COLS.join(', ')}</code></p>
                <p className="mt-0.5">이전 양식의 열 이름 <code className="bg-blue-100 px-1 rounded">처리기한</code>도 동일 필드로 인식됩니다.</p>
                <p className="mt-1">구분자: 탭(Excel 복사), 쉼표(CSV), 파이프(|) 자동 감지</p>
              </div>

              <div className="space-y-1.5">
                <Label>데이터 붙여넣기</Label>
                <Textarea
                  rows={8}
                  placeholder={`접수번호\t제목\t내용\t유형\t주소\t신청인\t연락처\t발생일자\n20240101-00001\t하천 쓰레기 방치\t내용...\t환경\t서울시 강남구\t홍길동\t010-1234-5678\t2024-02-01`}
                  value={raw}
                  onChange={(e) => { setRaw(e.target.value); setParsed(null) }}
                  className="font-mono text-xs"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* 파싱 미리보기 */}
              {parsed && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-700">
                    ✓ {parsed.length}건 파싱됨 — 아래 내용을 확인 후 등록하세요.
                  </p>
                  <div className="border rounded overflow-auto max-h-48">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          {Object.keys(parsed[0]).map((k) => (
                            <th key={k} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsed.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-3 py-2 text-gray-700 max-w-[120px] truncate">
                                {v}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsed.length > 5 && (
                      <p className="text-xs text-gray-400 px-3 py-2">... 외 {parsed.length - 5}건</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>취소</Button>
              {!parsed ? (
                <Button onClick={handleParse} disabled={!raw.trim()}>
                  파싱 확인
                </Button>
              ) : (
                <Button onClick={handleImport} disabled={loading}>
                  {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                  {parsed.length}건 등록
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
