'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { Loader2, X } from 'lucide-react'

interface OrgItem {
  id: string
  name: string
}

interface OrgSearchComboboxProps {
  id?: string
  label: string
  required?: boolean
  valueId: string | null
  valueName: string
  onChange: (id: string | null, name: string) => void
  disabled?: boolean
  hint?: string
}

export function OrgSearchCombobox({
  id,
  label,
  required,
  valueId,
  valueName,
  onChange,
  disabled,
  hint,
}: OrgSearchComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<OrgItem[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!open && !query) return
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ q: query })
        const res = await fetch(`/api/organizations/search?${qs}`)
        const data = (await res.json()) as OrgItem[]
        setItems(Array.isArray(data) ? data : [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open])

  function handleFocus() {
    setOpen(true)
    setQuery(valueName || query)
  }

  function selectItem(o: OrgItem) {
    onChange(o.id, o.name)
    setQuery('')
    setOpen(false)
    setItems([])
  }

  function clearSelection() {
    onChange(null, '')
    setQuery('')
    setItems([])
  }

  return (
    <div className="space-y-1.5" ref={wrapRef}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        {valueId && !disabled && (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
            <X className="w-3 h-3 mr-1" />
            선택 해제
          </Button>
        )}
      </div>
      {valueId ? (
        <div
          className={cn(
            'rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium text-gray-900',
            disabled && 'opacity-60'
          )}
        >
          {valueName}
        </div>
      ) : (
        <div className="relative">
          <Input
            id={id}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={handleFocus}
            placeholder="기관명을 입력해 검색하세요"
            disabled={disabled}
            autoComplete="off"
          />
          {open && (
            <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white shadow-md">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500 text-center">검색 결과가 없습니다.</p>
              ) : (
                <ul className="py-1">
                  {items.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectItem(o)}
                      >
                        {o.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
