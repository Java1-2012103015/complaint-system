'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PasteImportModal } from '@/components/complaints/paste-import-modal'
import { parsePastedText, formatFileSize } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import {
  Loader2, AlertCircle, Download, Upload, CheckCircle2,
  ClipboardPaste, FileText, Paperclip, X,
} from 'lucide-react'

// CSV 샘플 데이터
const CSV_SAMPLE = `접수번호,제목,내용,유형,주소,신청인,연락처,발생일자
20240101-00001,하천 쓰레기 방치 신고,하천변에 쓰레기가 방치되어 있습니다. 즉각 조치 부탁드립니다.,환경,서울시 강남구 논현동 123,홍길동,010-1234-5678,2024-02-28
20240101-00002,도로 포장 파손,왕복 2차선 도로 포장이 심하게 파손되어 차량 파손 우려,시설,서울시 서초구 방배동 45,김철수,010-9876-5432,2024-03-15`

function downloadSampleCsv() {
  const blob = new Blob(['﻿' + CSV_SAMPLE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'complaint_sample.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function NewComplaintPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)

  // 단건 등록 폼
  const [form, setForm] = useState({
    title: '', content: '', category: '', address: '', scheduledDate: '',
    complainantName: '', complainantPhone: '', complainantEmail: '', complainantAddr: '',
  })

  // CSV 파싱 미리보기
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>> | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvDone, setCsvDone] = useState(false)

  function setField(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  function addPendingFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setPendingFiles((p) => [...p, ...selected])
    e.target.value = ''
  }

  function removePendingFile(idx: number) {
    setPendingFiles((p) => p.filter((_, i) => i !== idx))
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.content) { setError('제목과 내용은 필수입니다.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '등록 실패')

      if (pendingFiles.length > 0) {
        const fd = new FormData()
        pendingFiles.forEach((f) => fd.append('files', f))
        const up = await fetch(`/api/upload?complaintId=${data.id}`, { method: 'POST', body: fd })
        const upData = await up.json().catch(() => ({}))
        if (!up.ok) {
          throw new Error(upData.error || '첨부 파일 업로드에 실패했습니다. 상세 화면에서 다시 시도할 수 있습니다.')
        }
        if (upData.errors?.length) {
          const msg = upData.errors.map((x: { name?: string; error?: string }) => `${x.name ?? ''}: ${x.error ?? ''}`).join('; ')
          toast({
            variant: 'destructive',
            title: '일부 첨부 실패',
            description: msg || '파일 형식·용량을 확인해 주세요.',
          })
        }
      }

      setPendingFiles([])
      router.push(`/admin/complaints/${data.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '등록 실패')
    } finally {
      setLoading(false)
    }
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = (ev.target?.result as string).replace(/^﻿/, '') // BOM 제거
      const rows = parsePastedText(text)
      if (rows.length === 0) {
        setError('CSV 파일에서 데이터를 읽을 수 없습니다.')
        return
      }
      setCsvRows(rows)
      setCsvDone(false)
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  async function handleCsvImport() {
    if (!csvRows) return
    setCsvImporting(true); setError('')
    try {
      const res = await fetch('/api/complaints/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: csvRows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '등록 실패')
      setCsvDone(true)
      setCsvRows(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCsvImporting(false)
    }
  }

  return (
    <>
      <Header title="자율보고 등록" />
      <main className="flex-1 p-6 max-w-4xl">
        <Tabs defaultValue="single">
          <TabsList className="mb-6">
            <TabsTrigger value="single" className="gap-2">
              <FileText className="w-4 h-4" />단건 등록
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <Upload className="w-4 h-4" />CSV 파일 등록
            </TabsTrigger>
            <TabsTrigger value="paste" className="gap-2">
              <ClipboardPaste className="w-4 h-4" />붙여넣기 등록
            </TabsTrigger>
          </TabsList>

          {/* ─ 단건 등록 ─────────────────────────── */}
          <TabsContent value="single">
            <form onSubmit={handleSingleSubmit} className="space-y-6">
              <Card>
                <CardHeader><CardTitle>자율보고 정보</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>제목 *</Label>
                    <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="자율보고 제목을 입력하세요" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>내용 *</Label>
                    <Textarea rows={5} value={form.content} onChange={(e) => setField('content', e.target.value)} placeholder="자율보고 내용을 입력하세요" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>유형</Label>
                      <Input value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="예: 환경, 시설, 교통" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>발생일자</Label>
                      <Input type="date" value={form.scheduledDate} onChange={(e) => setField('scheduledDate', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>현장 주소</Label>
                    <Input value={form.address} onChange={(e) => setField('address', e.target.value)} />
                  </div>
                  <div className="space-y-2 pt-1">
                    <Label>첨부 파일</Label>
                    <p className="text-xs text-gray-500">접수와 함께 등록됩니다. PDF, JPG, PNG, GIF, WebP (건당 최대 용량은 서버 설정)</p>
                    <input
                      ref={attachInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      className="hidden"
                      onChange={addPendingFiles}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => attachInputRef.current?.click()}>
                      <Paperclip className="w-4 h-4 mr-2" />
                      파일 선택
                    </Button>
                    {pendingFiles.length > 0 && (
                      <ul className="rounded-md border divide-y text-sm max-w-xl">
                        {pendingFiles.map((f, i) => (
                          <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50/80">
                            <span className="truncate font-medium text-gray-800">{f.name}</span>
                            <span className="text-gray-500 shrink-0 text-xs">{formatFileSize(f.size)}</span>
                            <button
                              type="button"
                              className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                              onClick={() => removePendingFile(i)}
                              aria-label="첨부 제거"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2">접수자 개인정보 <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">관리자만 열람</span></CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>성명</Label>
                      <Input value={form.complainantName} onChange={(e) => setField('complainantName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>연락처</Label>
                      <Input value={form.complainantPhone} onChange={(e) => setField('complainantPhone', e.target.value)} placeholder="010-0000-0000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>이메일</Label>
                      <Input type="email" value={form.complainantEmail} onChange={(e) => setField('complainantEmail', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>주소</Label>
                    <Input value={form.complainantAddr} onChange={(e) => setField('complainantAddr', e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}등록
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ─ CSV 파일 등록 ──────────────────────── */}
          <TabsContent value="csv">
            <Card>
              <CardHeader>
                <CardTitle>CSV 파일로 일괄 등록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 안내 */}
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700 space-y-2">
                  <p className="font-medium">CSV 형식 안내</p>
                  <p>첫 줄: 헤더 (콤마 구분)</p>
                  <code className="block bg-blue-100 px-2 py-1 rounded text-xs">
                    접수번호,제목,내용,유형,주소,신청인,연락처,발생일자
                  </code>
                  <p className="text-xs">• UTF-8 인코딩, BOM 있어도 자동 처리</p>
                  <p className="text-xs">• 접수번호 생략 시 자동 생성</p>
                  <p className="text-xs">• 마지막 열은 <strong>발생일자</strong>입니다. 예전 CSV의 <strong>처리기한</strong> 헤더도 동일하게 읽습니다.</p>
                </div>

                {/* 버튼 그룹 */}
                <div className="flex gap-3 flex-wrap">
                  <Button variant="outline" onClick={downloadSampleCsv}>
                    <Download className="w-4 h-4 mr-2" />
                    샘플 CSV 다운로드
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    CSV 파일 선택
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleCsvFile}
                  />
                </div>

                {/* 파싱 결과 미리보기 */}
                {csvRows && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {csvRows.length}건 파싱 완료 — 아래 내용을 확인 후 등록하세요.
                    </p>
                    <div className="border rounded-lg overflow-auto max-h-64">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            {Object.keys(csvRows[0]).map((k) => (
                              <th key={k} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {csvRows.slice(0, 10).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="px-3 py-2 text-gray-700 max-w-[140px] truncate">{v}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvRows.length > 10 && (
                        <p className="text-xs text-gray-400 px-3 py-2">... 외 {csvRows.length - 10}건</p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setCsvRows(null)}>취소</Button>
                      <Button onClick={handleCsvImport} disabled={csvImporting}>
                        {csvImporting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                        {csvRows.length}건 일괄 등록
                      </Button>
                    </div>
                  </div>
                )}

                {csvDone && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    일괄 등록이 완료되었습니다.
                    <Button variant="link" className="h-auto p-0 text-blue-600" onClick={() => router.push('/admin/complaints')}>
                      목록으로
                    </Button>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />{error}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─ 붙여넣기 등록 ──────────────────────── */}
          <TabsContent value="paste">
            <Card>
              <CardHeader><CardTitle>붙여넣기로 일괄 등록</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  외부 시스템에서 복사한 테이블 데이터를 붙여넣어 매핑 후 등록합니다.
                </p>
                <Button onClick={() => setPasteOpen(true)}>
                  <ClipboardPaste className="w-4 h-4 mr-2" />
                  붙여넣기 창 열기
                </Button>
              </CardContent>
            </Card>
            <PasteImportModal open={pasteOpen} onClose={() => setPasteOpen(false)} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
