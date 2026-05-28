import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MonthSelectorProps {
  value: string  // 'YYYY-MM'
  onChange: (next: string) => void
  minYear?: number
  maxYear?: number
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function parseMonth(v: string): { year: number; month: number } {
  const [y, m] = v.split('-').map(Number)
  return { year: y, month: m }
}

function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function todayYM(): string {
  const d = new Date()
  return formatMonth(d.getFullYear(), d.getMonth() + 1)
}

export function MonthSelector({ value, onChange, minYear, maxYear }: MonthSelectorProps) {
  const { year, month } = parseMonth(value)
  const currentYear = new Date().getFullYear()
  const yMin = minYear ?? currentYear - 5
  const yMax = maxYear ?? currentYear + 1

  function shift(delta: number) {
    let m = month + delta
    let y = year
    while (m < 1) { m += 12; y -= 1 }
    while (m > 12) { m -= 12; y += 1 }
    if (y < yMin) return
    if (y > yMax) return
    onChange(formatMonth(y, m))
  }

  const years: number[] = []
  for (let y = yMin; y <= yMax; y++) years.push(y)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => shift(-1)}
        aria-label="Mois précédent"
        className="h-11 w-11 rounded-xl border border-border bg-surface text-muted hover:text-text flex items-center justify-center"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <select
        value={month}
        onChange={(e) => onChange(formatMonth(year, Number(e.target.value)))}
        aria-label="Mois"
        className={cn(
          'h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text',
          'focus:outline-none focus:border-accent flex-1 sm:flex-none min-w-0'
        )}
      >
        {MONTHS_FR.map((label, i) => (
          <option key={i + 1} value={i + 1}>{label}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange(formatMonth(Number(e.target.value), month))}
        aria-label="Année"
        className={cn(
          'h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text',
          'focus:outline-none focus:border-accent'
        )}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => shift(+1)}
        aria-label="Mois suivant"
        className="h-11 w-11 rounded-xl border border-border bg-surface text-muted hover:text-text flex items-center justify-center"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onChange(todayYM())}
        className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text hover:bg-bg"
      >
        Aujourd'hui
      </button>
    </div>
  )
}
