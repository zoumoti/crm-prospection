import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  meta?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  allowClear?: boolean
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner…',
  emptyMessage = 'Aucun résultat',
  disabled,
  className,
  allowClear = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const needle = normalize(query.trim())
    return options.filter((o) =>
      normalize(`${o.label} ${o.meta ?? ''}`).includes(needle)
    )
  }, [options, query])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [open])

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[highlightedIndex]
      if (opt) {
        onChange(opt.value)
        setOpen(false)
        setQuery('')
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setHighlightedIndex(0)
          setOpen((o) => !o)
        }}
        className={cn(
          'w-full h-11 rounded-xl border border-border bg-surface px-3 text-left text-sm text-text',
          'flex items-center justify-between gap-2',
          'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
          'disabled:opacity-50 disabled:pointer-events-none'
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted')}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
              className="text-muted hover:text-text text-xs px-1"
            >
              ×
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted" />
        </div>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl bg-surface border border-border shadow-card p-2 max-h-72 overflow-hidden flex flex-col">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHighlightedIndex(0)
            }}
            onKeyDown={handleKey}
            placeholder="Rechercher…"
            className="h-9 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent mb-2"
          />
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted">{emptyMessage}</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                    setQuery('')
                  }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2',
                    i === highlightedIndex ? 'bg-bg' : '',
                    opt.value === value && 'text-accent'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{opt.label}</div>
                    {opt.meta && <div className="text-xs text-muted truncate">{opt.meta}</div>}
                  </div>
                  {opt.value === value && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
